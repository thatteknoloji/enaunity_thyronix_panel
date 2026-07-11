export type OrderEngine = "core" | "dealer_order";

export const FULFILLMENT_STATUSES = [
  "NEW",
  "PROCESSING",
  "WAITING_FOR_PACKING",
  "PACKING",
  "WAITING_FOR_SHIPMENT",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export function getOrderEngine(): OrderEngine {
  const engine = (process.env.ORDER_ENGINE || "core").toLowerCase();
  return engine === "dealer_order" ? "dealer_order" : "core";
}

export function isCoreOrderEngine(): boolean {
  return getOrderEngine() === "core";
}

export function isLegacyDealerOrderEnabled(): boolean {
  if (process.env.LEGACY_DEALER_ORDER_ENABLED === "true") return true;
  if (process.env.LEGACY_DEALER_ORDER_ENABLED === "false") return false;
  return getOrderEngine() === "dealer_order";
}

export function isDealerOrderMirrorEnabled(): boolean {
  return process.env.DEALER_ORDER_MIRROR_ENABLED === "true";
}

export function buildOrderMetadata(extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    sourceSystem: "CORE_ORDER",
    orderEngine: getOrderEngine(),
    futureUnifiedOrderReady: true,
    ...extra,
  });
}
