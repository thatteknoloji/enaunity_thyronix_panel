import { prisma } from "@/lib/db";
import type { PaymentProviderKey } from "./payment-types";
import { processPaymentSuccess } from "./payment-callback-service";

export async function logPaymentWebhook(data: {
  provider: string;
  eventType: string;
  providerReference: string;
  payload: unknown;
  status?: string;
  errorMessage?: string;
}) {
  return prisma.paymentWebhookLog.create({
    data: {
      provider: data.provider,
      eventType: data.eventType,
      providerReference: data.providerReference,
      payloadJson: JSON.stringify(data.payload),
      status: data.status || "RECEIVED",
      errorMessage: data.errorMessage || "",
    },
  });
}

export async function updateWebhookLog(
  id: string,
  data: { status: string; errorMessage?: string }
) {
  return prisma.paymentWebhookLog.update({
    where: { id },
    data: { status: data.status, errorMessage: data.errorMessage || "" },
  });
}

export async function handleProviderWebhook(
  provider: PaymentProviderKey,
  payload: Record<string, unknown>
) {
  const log = await logPaymentWebhook({
    provider,
    eventType: String(payload.eventType || payload.type || "webhook"),
    providerReference: String(
      payload.providerReference ||
        payload.referenceId ||
        payload.orderId ||
        payload.conversationId ||
        payload.paymentId ||
        ""
    ),
    payload,
  });

  try {
    const paymentId =
      String(payload.paymentId || payload.conversationId || payload.orderId || "") ||
      (await findPaymentIdByReference(String(payload.providerReference || payload.referenceId || "")));

    if (!paymentId) {
      await updateWebhookLog(log.id, { status: "IGNORED", errorMessage: "paymentId bulunamadı" });
      return { ok: false, message: "paymentId bulunamadı" };
    }

    const status = String(payload.status || payload.paymentStatus || "").toLowerCase();
    const success =
      status === "success" ||
      status === "paid" ||
      payload.paymentStatus === "SUCCESS" ||
      payload.status === "SUCCESS";

    if (!success) {
      await updateWebhookLog(log.id, { status: "IGNORED", errorMessage: "Başarısız veya bekleyen durum" });
      return { ok: false, message: "Ödeme başarılı değil" };
    }

    const result = await processPaymentSuccess(paymentId, provider);
    await updateWebhookLog(log.id, {
      status: result.success ? "PROCESSED" : "FAILED",
      errorMessage: result.success ? "" : result.message,
    });
    return { ok: result.success, message: result.message };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook işlenemedi";
    await updateWebhookLog(log.id, { status: "FAILED", errorMessage: msg });
    return { ok: false, message: msg };
  }
}

async function findPaymentIdByReference(ref: string) {
  if (!ref) return "";
  const payment = await prisma.modulePayment.findFirst({
    where: { OR: [{ id: ref }, { providerReference: ref }] },
    select: { id: true },
  });
  return payment?.id || "";
}
