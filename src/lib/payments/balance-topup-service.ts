import { prisma } from "@/lib/db";
import { addDealerBalance } from "@/lib/accounting/accounting-service";
import { createPaymentIntent } from "./payment-service";
import { getPublicPaymentSettings, getPaymentSettings, calculatePaymentTotal } from "./payment-settings";
import { resolveProviderKey } from "./gateway-config";
import { getBalanceTopUpSettings } from "./balance-topup-settings";
import { roundMoney } from "./checkout-payment-service";
import { createNotification } from "@/lib/notifications";

export async function listPendingTopUpsForDealer(dealerId: string) {
  return prisma.dealerBalanceTopUp.findMany({
    where: {
      dealerId,
      status: { in: ["PENDING_PAYMENT", "PENDING_APPROVAL"] },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingTopUpTotal(dealerId: string): Promise<number> {
  const rows = await listPendingTopUpsForDealer(dealerId);
  return roundMoney(rows.reduce((sum, r) => sum + r.amount, 0));
}

export async function startBalanceTopUp(opts: {
  dealerId: string;
  amount: number;
  method: "CARD" | "BANK_TRANSFER";
  returnUrl?: string;
  buyer?: { name: string; email: string; phone: string };
}) {
  const settings = await getBalanceTopUpSettings();
  if (!settings.enabled) {
    throw new Error("Bakiye yükleme şu an kapalı.");
  }

  const amount = roundMoney(opts.amount);
  if (amount < settings.minAmount) {
    throw new Error(settings.belowMinMessage);
  }

  if (opts.method === "BANK_TRANSFER" && !settings.bankTransferEnabled) {
    throw new Error("Havale ile bakiye yükleme kapalı.");
  }

  const dealer = await prisma.dealer.findUnique({ where: { id: opts.dealerId } });
  if (!dealer) throw new Error("Bayi bulunamadı");

  const topUp = await prisma.dealerBalanceTopUp.create({
    data: {
      dealerId: opts.dealerId,
      amount,
      method: opts.method,
      status: opts.method === "BANK_TRANSFER" ? "PENDING_APPROVAL" : "PENDING_PAYMENT",
      returnUrl: opts.returnUrl || "/dealer/balance",
      metadataJson: JSON.stringify({ source: "DEALER_BALANCE_TOPUP_V1" }),
    },
  });

  if (opts.method === "BANK_TRANSFER") {
    const publicSettings = await getPublicPaymentSettings();
    return {
      topUpId: topUp.id,
      status: topUp.status,
      amount,
      pendingMessage: settings.pendingMessage,
      bankTransferEnabled: publicSettings.bankTransferEnabled,
    };
  }

  const publicSettings = await getPublicPaymentSettings();
  const cardMethod = publicSettings.activeCardProvider;
  if (cardMethod !== "ESNEKPOS" && cardMethod !== "IYZICO") {
    await prisma.dealerBalanceTopUp.update({
      where: { id: topUp.id },
      data: { status: "FAILED" },
    });
    throw new Error("Kart ödeme altyapısı yapılandırılmamış.");
  }

  const paymentSettings = await getPaymentSettings();
  const payAmount =
    cardMethod === "ESNEKPOS" || cardMethod === "IYZICO"
      ? calculatePaymentTotal(amount, cardMethod, paymentSettings).totalAmount
      : amount;

  const result = await createPaymentIntent({
    dealerId: opts.dealerId,
    moduleKey: "BALANCE_TOPUP",
    planKey: topUp.id,
    amount: payAmount,
    currency: "TRY",
    paymentType: "CARD",
    providerKey: resolveProviderKey(cardMethod),
    metadata: {
      buyer: opts.buyer || {
        id: dealer.id,
        name: dealer.name || dealer.company || "Bayi",
        email: dealer.email,
        phone: dealer.phone || "5550000000",
      },
      topUpId: topUp.id,
      returnUrl: topUp.returnUrl,
    },
  });

  if (!result.success) {
    await prisma.dealerBalanceTopUp.update({
      where: { id: topUp.id },
      data: { status: "FAILED" },
    });
    throw new Error(result.message || "Ödeme başlatılamadı");
  }

  await prisma.dealerBalanceTopUp.update({
    where: { id: topUp.id },
    data: { gatewayRef: result.paymentId || "" },
  });

  return {
    topUpId: topUp.id,
    status: topUp.status,
    amount,
    paymentId: result.paymentId,
    redirectUrl: result.redirectUrl,
  };
}

export async function completeBalanceTopUpFromPayment(paymentId: string) {
  const payment = await prisma.modulePayment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.moduleKey !== "BALANCE_TOPUP") {
    return { success: false, error: "Top-up ödemesi bulunamadı" };
  }

  const topUp = await prisma.dealerBalanceTopUp.findUnique({ where: { id: payment.planKey } });
  if (!topUp) return { success: false, error: "Top-up kaydı bulunamadı" };
  if (topUp.status === "COMPLETED") return { success: true, topUpId: topUp.id };

  await addDealerBalance(
    payment.dealerId,
    topUp.amount,
    undefined,
    "TOPUP_CARD",
    `Kart ile bakiye yükleme (#${topUp.id.slice(0, 8)})`
  );

  await prisma.dealerBalanceTopUp.update({
    where: { id: topUp.id },
    data: { status: "COMPLETED", completedAt: new Date(), gatewayRef: paymentId },
  });

  await prisma.payment.create({
    data: {
      dealerId: payment.dealerId,
      amount: topUp.amount,
      type: "topup_card",
      status: "COMPLETED",
      note: `Bakiye yükleme ${topUp.id.slice(0, 8)}`,
    },
  });

  void createNotification({
    dealerId: payment.dealerId,
    title: "Bakiye Yüklendi",
    message: `${topUp.amount.toLocaleString("tr-TR")} ₺ bakiyenize eklendi.`,
    type: "payment",
    link: "/dealer/balance",
  }).catch(() => {});

  return { success: true, topUpId: topUp.id, returnUrl: topUp.returnUrl };
}

export async function approveBankTransferTopUp(topUpId: string, adminUserId: string) {
  const topUp = await prisma.dealerBalanceTopUp.findUnique({ where: { id: topUpId } });
  if (!topUp) throw new Error("Talep bulunamadı");
  if (topUp.status !== "PENDING_APPROVAL") throw new Error("Talep onay bekliyor durumunda değil");

  await addDealerBalance(
    topUp.dealerId,
    topUp.amount,
    undefined,
    "TOPUP_BANK",
    `Havale ile bakiye yükleme (#${topUp.id.slice(0, 8)})`
  );

  await prisma.dealerBalanceTopUp.update({
    where: { id: topUpId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      approvedBy: adminUserId,
    },
  });

  await prisma.payment.create({
    data: {
      dealerId: topUp.dealerId,
      amount: topUp.amount,
      type: "topup_bank",
      status: "COMPLETED",
      note: `Havale bakiye yükleme ${topUp.id.slice(0, 8)}`,
    },
  });

  void createNotification({
    dealerId: topUp.dealerId,
    title: "Bakiye Onaylandı",
    message: `${topUp.amount.toLocaleString("tr-TR")} ₺ havale bakiyenize eklendi.`,
    type: "payment",
    link: "/dealer/balance",
  }).catch(() => {});

  return topUp;
}

export async function rejectBankTransferTopUp(topUpId: string, adminUserId: string, note: string) {
  const topUp = await prisma.dealerBalanceTopUp.findUnique({ where: { id: topUpId } });
  if (!topUp) throw new Error("Talep bulunamadı");
  if (topUp.status !== "PENDING_APPROVAL") throw new Error("Talep onay bekliyor durumunda değil");

  await prisma.dealerBalanceTopUp.update({
    where: { id: topUpId },
    data: {
      status: "REJECTED",
      approvedBy: adminUserId,
      adminNote: note,
    },
  });

  void createNotification({
    dealerId: topUp.dealerId,
    title: "Bakiye Talebi Reddedildi",
    message: note || "Havale bakiye yükleme talebiniz reddedildi.",
    type: "payment",
    link: "/dealer/balance",
  }).catch(() => {});

  return topUp;
}
