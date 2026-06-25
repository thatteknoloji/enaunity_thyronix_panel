import { prisma } from "@/lib/db";
import { checkDealerCredit, deductDealerBalance } from "@/lib/dealer-pricing";
import { canDealerPurchaseModule } from "@/lib/modules/access";
import { createPaymentIntent } from "./payment-service";
import { assertPaymentMethodAllowed } from "./payment-method-policy";
import { notifyBankTransferCreated } from "./payment-deadline-worker";
import {
  resolveProviderKey,
  type ProductLibraryPaymentMethod,
} from "./gateway-config";
import { calculatePaymentTotal, getPaymentSettings } from "./payment-settings";
import {
  assertPaymentModeAllowed,
  buildCheckoutPaymentContext,
  buildOrderPaymentMetadata,
  roundMoney,
  type PaymentMode,
} from "./checkout-payment-service";

export type ModulePurchaseInput = {
  dealerId: string;
  moduleKey: string;
  planKey: string;
  paymentMethod?: string;
  paymentMode?: PaymentMode;
  installmentCount?: number;
};

export type ModulePurchaseResult = {
  success: boolean;
  paymentId?: string;
  status?: string;
  message?: string;
  redirectUrl?: string | null;
  requiresReceipt?: boolean;
  paymentMethod?: string;
  paymentMode?: PaymentMode;
  moduleKey: string;
  planKey: string;
};

async function activateModuleLicense(dealerId: string, moduleKey: string, planKey: string, amount: number) {
  const existingLicense = await prisma.moduleLicense.findFirst({
    where: { dealerId, moduleKey },
    orderBy: { createdAt: "desc" },
  });
  const billingPeriod = "monthly";
  const { computeLicenseEndsAt } = await import("@/lib/modules/subscription-utils");
  const endsAt = computeLicenseEndsAt(new Date(), billingPeriod);

  let licenseId: string;
  if (existingLicense) {
    const { resetLicenseLifecycleFlags } = await import("@/lib/modules/subscription-lifecycle-worker");
    await resetLicenseLifecycleFlags(existingLicense.id, endsAt, billingPeriod);
    const license = await prisma.moduleLicense.update({
      where: { id: existingLicense.id },
      data: {
        planKey,
        status: "ACTIVE",
        startsAt: new Date(),
        endsAt,
        lifecycleStage: "active",
        billingPeriod,
      },
    });
    licenseId = license.id;
  } else {
    const license = await prisma.moduleLicense.create({
      data: {
        dealerId,
        moduleKey,
        planKey,
        status: "ACTIVE",
        billingPeriod,
        startsAt: new Date(),
        endsAt,
        lifecycleStage: "active",
      },
    });
    licenseId = license.id;
  }

  const { syncLicenseMetadataFromPlan } = await import("@/lib/modules/license-metadata");
  await syncLicenseMetadataFromPlan(licenseId, moduleKey, planKey);
  const { processModuleLicenseCommission } = await import("@/lib/partners/commission-service");
  await processModuleLicenseCommission({
    dealerId,
    moduleLicenseId: licenseId,
    moduleKey,
    amount,
  }).catch(() => {});

  return licenseId;
}

export async function processModulePurchase(input: ModulePurchaseInput): Promise<ModulePurchaseResult> {
  const { dealerId, moduleKey, planKey, installmentCount = 1 } = input;
  const method = (input.paymentMethod || "BANK_TRANSFER") as ProductLibraryPaymentMethod | "DEALER_ACCOUNT" | "SPLIT";
  const isManualBankTransfer = method === "BANK_TRANSFER" && !input.paymentMode;

  const canPurchase = await canDealerPurchaseModule(dealerId);
  if (!canPurchase) {
    throw new Error("Bayi onayınız tamamlanmadan modül satın alamazsınız");
  }

  const plan = await prisma.modulePlan.findFirst({ where: { moduleKey, planKey, isActive: true } });
  if (!plan) throw new Error("Geçersiz paket");

  const existing = await prisma.moduleLicense.findFirst({
    where: { dealerId, moduleKey, status: { in: ["ACTIVE", "TRIAL"] } },
  });
  if (existing) throw new Error("Bu modül için zaten aktif bir lisansınız var");

  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
  if (!dealer) throw new Error("Bayi bulunamadı");

  const baseAmount = roundMoney(plan.monthlyPrice);

  const { resolveDealerPaymentMethods } = await import("./payment-method-policy");
  const policy = await resolveDealerPaymentMethods(dealerId);
  const checkoutCtx = await buildCheckoutPaymentContext({
    dealerId,
    cartTotal: baseAmount,
    balanceEnabled: policy.balanceEnabled,
  });

  let paymentMode: PaymentMode | null = input.paymentMode || null;
  if (!paymentMode) {
    if (method === "DEALER_ACCOUNT") paymentMode = "BALANCE_ONLY";
    else if (method === "SPLIT") paymentMode = "SPLIT";
    else if (!isManualBankTransfer) paymentMode = "CARD_ONLY";
  }

  if (paymentMode) {
    const modeCheck = assertPaymentModeAllowed(checkoutCtx, paymentMode);
    if (!modeCheck.ok) throw new Error(modeCheck.error || "Ödeme modu kullanılamaz");
  }

  const paymentMeta = paymentMode
    ? buildOrderPaymentMetadata({
        mode: paymentMode,
        cartTotal: baseAmount,
        balancePortion:
          paymentMode === "BALANCE_ONLY"
            ? baseAmount
            : paymentMode === "SPLIT"
              ? checkoutCtx.split.balancePortion
              : 0,
        cardPortion:
          paymentMode === "CARD_ONLY"
            ? baseAmount
            : paymentMode === "SPLIT"
              ? checkoutCtx.split.cardPortion
              : 0,
      })
    : null;

  if (paymentMode === "BALANCE_ONLY") {
    const credit = await checkDealerCredit(dealerId, baseAmount);
    if (!credit.ok) throw new Error(credit.message);

    const payment = await prisma.modulePayment.create({
      data: {
        dealerId,
        moduleKey,
        planKey,
        amount: baseAmount,
        currency: plan.currency || "TRY",
        status: "PAID",
        provider: "DEALER_ACCOUNT",
        paymentType: "one_time",
        paidAt: new Date(),
        metadataJson: JSON.stringify({ payment: paymentMeta, paymentMode }),
      },
    });

    await deductDealerBalance(dealerId, baseAmount, undefined, "MODULE_PAYMENT", `${moduleKey} modül ödemesi`);
    await prisma.payment.create({
      data: {
        dealerId,
        amount: baseAmount,
        type: "balance",
        status: "COMPLETED",
        note: `${moduleKey} modül — bakiye ödemesi`,
      },
    });
    await activateModuleLicense(dealerId, moduleKey, planKey, baseAmount);

    return {
      success: true,
      paymentId: payment.id,
      status: "PAID",
      message: "Modül bakiyeden ödendi ve lisans aktifleştirildi.",
      moduleKey,
      planKey,
      paymentMethod: "DEALER_ACCOUNT",
      paymentMode,
    };
  }

  const cardMethod: ProductLibraryPaymentMethod =
    method === "IYZICO" ? "IYZICO" : method === "BANK_TRANSFER" ? "BANK_TRANSFER" : "ESNEKPOS";

  if (method === "BANK_TRANSFER") {
    const allowed = await assertPaymentMethodAllowed(dealerId, "BANK_TRANSFER");
    if (!allowed.ok) throw new Error(allowed.error);
  }

  if (paymentMode === "CARD_ONLY" || paymentMode === "SPLIT") {
    if (paymentMode === "SPLIT" && method === "BANK_TRANSFER") {
      throw new Error("Bölünmüş ödeme için kart sağlayıcısı gerekir");
    }
    const checkMethod: ProductLibraryPaymentMethod =
      method === "SPLIT" ? cardMethod : (method as ProductLibraryPaymentMethod);
    const allowed = await assertPaymentMethodAllowed(dealerId, checkMethod);
    if (!allowed.ok) throw new Error(allowed.error);
  }

  let payAmount = paymentMode === "SPLIT" ? checkoutCtx.split.cardPortion : baseAmount;
  const providerKey = resolveProviderKey(cardMethod);
  if (cardMethod === "ESNEKPOS" || cardMethod === "IYZICO") {
    const settings = await getPaymentSettings();
    payAmount = calculatePaymentTotal(payAmount, cardMethod, settings).totalAmount;
  }

  const result = await createPaymentIntent({
    dealerId,
    moduleKey,
    planKey,
    amount: payAmount,
    currency: plan.currency || "TRY",
    paymentType: cardMethod === "BANK_TRANSFER" ? "MANUAL" : "CARD",
    providerKey,
    metadata: {
      buyer: {
        id: dealerId,
        name: dealer.name || dealer.company || "Bayi",
        email: dealer.email || "",
        phone: dealer.phone || "5550000000",
      },
      installmentCount,
      ...(paymentMode ? { paymentMode } : {}),
      ...(paymentMeta ? { paymentMeta } : {}),
    },
  });

  if (result.paymentId) {
    await prisma.modulePayment.update({
      where: { id: result.paymentId },
      data: {
        metadataJson: JSON.stringify({ payment: paymentMeta, paymentMode }),
      },
    });
  }

  if (method === "BANK_TRANSFER" && result.success) {
    await notifyBankTransferCreated({
      dealerId,
      title: "Havale/EFT — dekont yükleyin",
      message: `${moduleKey} modül ödemeniz için dekont yüklemeniz zorunludur.`,
      link: `/payment/pending?module=${moduleKey}&plan=${planKey}&paymentId=${result.paymentId}`,
    });
  }

  return {
    success: result.success,
    paymentId: result.paymentId,
    status: result.status,
    message: result.message,
    redirectUrl: result.redirectUrl || null,
    requiresReceipt: method === "BANK_TRANSFER",
    moduleKey,
    planKey,
    paymentMethod: paymentMode === "SPLIT" ? "SPLIT" : cardMethod,
    paymentMode: paymentMode || undefined,
  };
}
