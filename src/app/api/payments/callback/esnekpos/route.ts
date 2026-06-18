import { NextResponse } from "next/server";
import { createProviderByKey } from "@/lib/payments/payment-provider-factory";
import { processPaymentSuccess, processPaymentFailure } from "@/lib/payments/payment-callback-service";
import { logPaymentWebhook } from "@/lib/payments/webhook-service";

async function parseCallbackPayload(req: Request) {
  const url = new URL(req.url);
  const queryPaymentId = url.searchParams.get("paymentId") || "";

  let body: Record<string, string> = {};
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const json = await req.json();
      body = Object.fromEntries(
        Object.entries(json as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")])
      );
    } catch {
      body = {};
    }
  } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      form.forEach((value, key) => {
        body[key] = String(value);
      });
    } catch {
      body = {};
    }
  }

  url.searchParams.forEach((value, key) => {
    body[key] = value;
  });

  const paymentId = queryPaymentId || body.paymentId || "";
  const status = (body.STATUS || body.status || "").toUpperCase();
  const returnCode = body.RETURN_CODE || "";
  const providerReference = body.REFNO || body.ORDER_REF_NUMBER || paymentId;

  return { paymentId, status, returnCode, providerReference, body };
}

async function handleCallback(req: Request) {
  const { paymentId, status, returnCode, providerReference, body } = await parseCallbackPayload(req);

  await logPaymentWebhook({
    provider: "ESNEKPOS",
    eventType: req.method === "POST" ? "callback_post" : "callback_get",
    providerReference,
    payload: body,
  });

  if (!paymentId) {
    return NextResponse.redirect(new URL("/payment/fail?reason=missing_payment", req.url));
  }

  const provider = createProviderByKey("ESNEKPOS");
  const verify = await provider.verifyPayment({ paymentId, providerReference });

  const success =
    verify.success ||
    (status === "SUCCESS" && returnCode === "0") ||
    body.sandbox === "1";

  if (success) {
    const result = await processPaymentSuccess(paymentId, "ESNEKPOS");
    if (result.success) {
      return NextResponse.redirect(new URL(`/payment/success?paymentId=${paymentId}`, req.url));
    }
  }

  await processPaymentFailure(paymentId);
  return NextResponse.redirect(new URL(`/payment/fail?paymentId=${paymentId}`, req.url));
}

export async function GET(req: Request) {
  return handleCallback(req);
}

export async function POST(req: Request) {
  return handleCallback(req);
}
