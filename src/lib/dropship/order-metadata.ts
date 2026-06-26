import { STORE_NOTIFICATION_NOT_CONFIGURED, STORE_PAYMENT_STATUS_PENDING_MANUAL } from "./payment-display";

export function generateStoreOrderNumber(now = new Date()): string {
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DS-${ymd}-${suffix}`;
}

export function buildNewStoreOrderMetadata() {
  return {
    orderNumber: generateStoreOrderNumber(),
    paymentStatus: STORE_PAYMENT_STATUS_PENDING_MANUAL,
    notificationStatus: STORE_NOTIFICATION_NOT_CONFIGURED,
  };
}

export function formatStoreOrderLabel(order: { orderNumber?: string | null; id: string }): string {
  return order.orderNumber?.trim() || order.id;
}
