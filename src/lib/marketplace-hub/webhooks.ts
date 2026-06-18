import { prisma } from "@/lib/db";
import { importMarketplaceOrderToFulfillment } from "./import-engine";

export async function handleWebhookEvent(params: {
  marketplace: string;
  eventType: string;
  payload: Record<string, unknown>;
  connectionId?: string;
}) {
  const event = await prisma.marketplaceWebhookEvent.create({
    data: {
      connectionId: params.connectionId || null,
      marketplace: params.marketplace.toUpperCase(),
      eventType: params.eventType,
      payloadJson: JSON.stringify(params.payload),
      status: "RECEIVED",
    },
  });

  try {
    if (params.eventType === "ORDER_CREATED" || params.eventType === "NEW_ORDER") {
      const dealerId = String(params.payload.dealerId || "");
      const connectionId = params.connectionId || String(params.payload.connectionId || "");
      if (!dealerId || !connectionId) throw new Error("dealerId ve connectionId gerekli");

      await importMarketplaceOrderToFulfillment({
        dealerId,
        connectionId,
        payload: {
          platform: params.marketplace,
          platformOrderId: String(params.payload.orderId || params.payload.platformOrderId),
          customerName: String(params.payload.customerName || ""),
          customerPhone: String(params.payload.customerPhone || ""),
          customerCity: String(params.payload.customerCity || ""),
          items: (params.payload.items as any[]) || [],
        },
      });
    }

    if (params.eventType === "ORDER_CANCELLED") {
      const orderId = String(params.payload.dealerOrderId || "");
      if (orderId) {
        await prisma.dealerOrder.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
      }
    }

    if (params.eventType === "ORDER_RETURNED") {
      const orderId = String(params.payload.dealerOrderId || "");
      if (orderId) {
        await prisma.dealerOrder.update({ where: { id: orderId }, data: { status: "RETURNED" } });
      }
    }

    await prisma.marketplaceWebhookEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSED" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook işlenemedi";
    await prisma.marketplaceWebhookEvent.update({
      where: { id: event.id },
      data: { status: "FAILED", errorMessage: msg },
    });
    throw e;
  }

  return event;
}
