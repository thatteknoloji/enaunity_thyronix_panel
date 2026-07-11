import { NextResponse } from "next/server";
import { handleWebhookEvent } from "@/lib/marketplace-hub/webhooks";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const marketplace = String(body.marketplace || req.headers.get("x-marketplace") || "TRENDYOL");
    const eventType = String(body.eventType || body.type || "NEW_ORDER");
    const result = await handleWebhookEvent({
      marketplace,
      eventType,
      payload: body.payload || body,
      connectionId: body.connectionId,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
