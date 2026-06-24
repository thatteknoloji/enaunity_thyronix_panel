import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createProviderByKey } from "@/lib/payments/payment-provider-factory";
import { processPaymentSuccess, processPaymentFailure } from "@/lib/payments/payment-callback-service";
import { logPaymentWebhook } from "@/lib/payments/webhook-service";
import { esnekposOrderRef } from "@/lib/payments/esnekpos-provider";

async function resolvePaymentId(paymentId: string, orderRef: string, providerReference: string) {
  if (paymentId) {
    const direct = await prisma.modulePayment.findUnique({ where: { id: paymentId } });
    if (direct) return paymentId;
  }

  if (providerReference) {
    const byRef = await prisma.modulePayment.findFirst({
      where: { providerReference, provider: "ESNEKPOS" },
      orderBy: { createdAt: "desc" },
    });
    if (byRef) return byRef.id;
  }

  if (orderRef) {
    const waiting = await prisma.modulePayment.findMany({
      where: { provider: "ESNEKPOS", status: { in: ["WAITING_PAYMENT", "PENDING", "MANUAL_REVIEW"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const match = waiting.find((p) => esnekposOrderRef(p.id) === orderRef);
    if (match) return match.id;
  }

  return paymentId;
}

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
  const orderRef = body.ORDER_REF_NUMBER || "";
  const providerReference = body.REFNO || orderRef || paymentId;

  return { paymentId, status, returnCode, providerReference, orderRef, body };
}

async function handleCallback(req: Request) {
  const { paymentId: rawPaymentId, status, returnCode, providerReference, orderRef, body } = await parseCallbackPayload(req);
  const paymentId = await resolvePaymentId(rawPaymentId, orderRef, providerReference);

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
      const payment = await prisma.modulePayment.findUnique({
        where: { id: paymentId },
        select: { moduleKey: true, planKey: true },
      });
      if (payment?.moduleKey === "BALANCE_TOPUP" && payment.planKey) {
        const topUp = await prisma.dealerBalanceTopUp.findUnique({
          where: { id: payment.planKey },
          select: { returnUrl: true },
        });
        return NextResponse.redirect(new URL(topUp?.returnUrl || "/dealer/balance", req.url));
      }
      if (payment?.moduleKey === "B2B_ORDER" && payment.planKey) {
        const order = await prisma.order.findUnique({
          where: { id: payment.planKey },
          select: { id: true, dealerId: true },
        });
        if (order) {
          return NextResponse.redirect(
            new URL(order.dealerId ? `/dealer/orders/${order.id}` : `/admin/orders/${order.id}`, req.url),
          );
        }
      }
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
