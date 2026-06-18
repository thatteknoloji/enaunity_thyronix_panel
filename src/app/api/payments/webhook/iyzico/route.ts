import { NextResponse } from "next/server";
import { handleProviderWebhook } from "@/lib/payments/webhook-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await handleProviderWebhook("IYZICO", {
      ...body,
      paymentId: body.conversationId || body.paymentId,
      providerReference: body.token || body.paymentId,
      status: body.paymentStatus || body.status,
    });
    return NextResponse.json({ received: true, ...result });
  } catch {
    return NextResponse.json({ error: "Webhook işlenemedi" }, { status: 500 });
  }
}
