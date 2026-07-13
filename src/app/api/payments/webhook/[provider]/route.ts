import { NextResponse } from "next/server";
import { normalizeProviderParam } from "@/lib/payments/payment-provider-factory";
import { handleProviderWebhook } from "@/lib/payments/webhook-service";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerParam } = await params;
  const provider = normalizeProviderParam(providerParam);
  if (!provider) {
    return NextResponse.json({ error: "Geçersiz provider" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const result = await handleProviderWebhook(provider, {
      ...body,
      paymentId: body.conversationId || body.paymentId || body.orderId,
      providerReference: body.referenceId || body.token || body.orderId,
      status: body.paymentStatus || body.status,
    });
    return NextResponse.json({ received: true, ...result });
  } catch {
    return NextResponse.json({ error: "Webhook işlenemedi" }, { status: 500 });
  }
}
