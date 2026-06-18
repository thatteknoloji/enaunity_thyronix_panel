import { prisma } from "@/lib/db";
import { approvePayment } from "./payment-service";
import { recordInvoicePayment } from "@/lib/invoices/invoice-service";
import type { PaymentProviderKey } from "./payment-types";
import type { PaymentResult } from "./payment-types";

export async function processPaymentSuccess(
  paymentId: string,
  provider?: PaymentProviderKey
): Promise<PaymentResult> {
  const modulePayment = await prisma.modulePayment.findUnique({ where: { id: paymentId } });
  if (modulePayment) {
    if (modulePayment.status === "PAID") {
      return { success: true, status: "PAID", message: "Ödeme zaten işlenmiş", paymentId };
    }
    if (provider && modulePayment.provider !== provider) {
      await prisma.modulePayment.update({
        where: { id: paymentId },
        data: { provider },
      });
    }
    return approvePayment(paymentId);
  }

  const invoicePayment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: true },
  });
  if (invoicePayment?.invoiceId && invoicePayment.status === "PENDING") {
    await recordInvoicePayment({
      invoiceId: invoicePayment.invoiceId,
      amount: invoicePayment.amount,
      note: `${provider || "gateway"} online ödeme`,
    });
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "COMPLETED" },
    });
    return { success: true, status: "PAID", message: "Fatura ödemesi kaydedildi", paymentId };
  }

  return { success: false, status: "FAILED", message: "Ödeme kaydı bulunamadı" };
}

export async function processPaymentFailure(paymentId: string): Promise<PaymentResult> {
  const modulePayment = await prisma.modulePayment.findUnique({ where: { id: paymentId } });
  if (modulePayment) {
    await prisma.modulePayment.update({ where: { id: paymentId }, data: { status: "FAILED" } });
    return { success: true, status: "FAILED", message: "Ödeme başarısız olarak işaretlendi" };
  }
  await prisma.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "FAILED" },
  });
  return { success: true, status: "FAILED", message: "Ödeme başarısız" };
}
