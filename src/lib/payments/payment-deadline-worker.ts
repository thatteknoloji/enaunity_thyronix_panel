import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { rejectPayment } from "./payment-service";

const REMINDER_BEFORE_HOURS = 4;

async function notifyDealer(
  dealerId: string,
  title: string,
  message: string,
  link: string,
) {
  await createNotification({ dealerId, title, message, type: "payment", link });
  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId }, select: { email: true, name: true } });
  if (dealer?.email) {
    const { sendEmail } = await import("@/lib/notifications");
    await sendEmail({
      to: dealer.email,
      subject: title,
      html: `<p>Merhaba ${dealer.name},</p><p>${message}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3333"}${link}">Detay</a></p>`,
    });
  }
}

async function hasReceiptForPayment(paymentId: string): Promise<boolean> {
  const n = await prisma.bankTransferNotification.findFirst({
    where: { modulePaymentId: paymentId, receiptUrl: { not: "" } },
  });
  return !!n;
}

async function hasReceiptForOrder(orderId: string): Promise<boolean> {
  const n = await prisma.bankTransferNotification.findFirst({
    where: { orderId, receiptUrl: { not: "" } },
  });
  return !!n;
}

export async function runPaymentDeadlineJobs() {
  const now = new Date();
  const reminderThreshold = new Date(now.getTime() + REMINDER_BEFORE_HOURS * 60 * 60 * 1000);
  let reminders = 0;
  let cancelled = 0;

  const pendingPayments = await prisma.modulePayment.findMany({
    where: {
      status: { in: ["WAITING_PAYMENT", "MANUAL_REVIEW"] },
      provider: "MANUAL",
      paymentDeadlineAt: { not: null },
    },
  });

  for (const payment of pendingPayments) {
    if (!payment.paymentDeadlineAt) continue;
    const hasReceipt = await hasReceiptForPayment(payment.id);
    if (hasReceipt) continue;

    if (payment.paymentDeadlineAt <= now) {
      await rejectPayment(payment.id);
      await notifyDealer(
        payment.dealerId,
        "Ödeme iptal edildi",
        `${payment.moduleKey} ödemeniz 24 saat içinde dekont yüklenmediği için iptal edildi.`,
        payment.moduleKey === "B2B_ORDER"
          ? `/dealer/orders/${payment.planKey}`
          : "/payment/pending",
      );
      cancelled++;
      continue;
    }

    if (!payment.receiptReminderSent && payment.paymentDeadlineAt <= reminderThreshold) {
      await prisma.modulePayment.update({
        where: { id: payment.id },
        data: { receiptReminderSent: true },
      });
      await notifyDealer(
        payment.dealerId,
        "Dekont yüklemeniz gerekiyor",
        `Havale/EFT ödemeniz için dekont yüklemeniz gerekiyor. ${REMINDER_BEFORE_HOURS} saat içinde yüklenmezse işlem iptal edilir.`,
        "/dealer/profile",
      );
      reminders++;
    }
  }

  const pendingOrders = await prisma.order.findMany({
    where: {
      status: "waiting_payment",
      paymentDeadlineAt: { not: null },
      dealerId: { not: null },
    },
  });

  for (const order of pendingOrders) {
    if (!order.paymentDeadlineAt || !order.dealerId) continue;
    const hasReceipt = await hasReceiptForOrder(order.id);
    if (hasReceipt) continue;

    if (order.paymentDeadlineAt <= now) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "cancelled",
          note: "24 saat içinde dekont yüklenmedi — otomatik iptal",
          changedBy: "system",
        },
      });
      await notifyDealer(
        order.dealerId,
        "Sipariş iptal edildi",
        `#${order.id.slice(0, 8)} nolu siparişiniz dekont yüklenmediği için iptal edildi.`,
        `/dealer/orders/${order.id}`,
      );
      cancelled++;
      continue;
    }

    if (!order.receiptReminderSent && order.paymentDeadlineAt <= reminderThreshold) {
      await prisma.order.update({
        where: { id: order.id },
        data: { receiptReminderSent: true },
      });
      await notifyDealer(
        order.dealerId,
        "Dekont yüklemeniz gerekiyor",
        `#${order.id.slice(0, 8)} nolu sipariş için havale dekontunuzu yükleyin. ${REMINDER_BEFORE_HOURS} saat içinde yüklenmezse sipariş iptal edilir.`,
        `/dealer/orders/${order.id}`,
      );
      reminders++;
    }
  }

  return { reminders, cancelled, checkedPayments: pendingPayments.length, checkedOrders: pendingOrders.length };
}

export async function notifyBankTransferCreated(params: {
  dealerId: string;
  title: string;
  message: string;
  link: string;
}) {
  await notifyDealer(params.dealerId, params.title, params.message, params.link);
}
