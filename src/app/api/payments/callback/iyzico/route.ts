import { NextResponse } from "next/server";
import { createProviderByKey } from "@/lib/payments/payment-provider-factory";
import { processPaymentSuccess, processPaymentFailure } from "@/lib/payments/payment-callback-service";
import { logPaymentWebhook } from "@/lib/payments/webhook-service";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("paymentId") || "";
  let token = url.searchParams.get("token") || "";

  try {
    const form = await req.formData();
    token = token || String(form.get("token") || "");
  } catch {
    // GET-style callback
  }

  await logPaymentWebhook({
    provider: "IYZICO",
    eventType: "callback",
    providerReference: token,
    payload: { paymentId, token },
  });

  if (!paymentId) {
    return NextResponse.redirect(new URL("/payment/fail?reason=missing_payment", req.url));
  }

  const provider = createProviderByKey("IYZICO");
  const verify = await provider.verifyPayment({ paymentId, providerReference: token });

  if (verify.success) {
    const result = await processPaymentSuccess(paymentId, "IYZICO");
    if (result.success) {
      return NextResponse.redirect(new URL(`/payment/success?paymentId=${paymentId}`, req.url));
    }
  }

  await processPaymentFailure(paymentId);
  return NextResponse.redirect(new URL(`/payment/fail?paymentId=${paymentId}`, req.url));
}

export async function GET(req: Request) {
  return POST(req);
}
