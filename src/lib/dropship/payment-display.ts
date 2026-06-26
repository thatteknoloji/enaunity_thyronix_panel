export type StorePaymentDisplayModel = "PLATFORM_PAYMENT" | "DEALER_PAYMENT" | "MANUAL_ORDER";

export const STORE_PAYMENT_STATUS_PENDING_MANUAL = "PENDING_MANUAL" as const;
export const STORE_NOTIFICATION_NOT_CONFIGURED = "NOT_CONFIGURED" as const;

export function resolveStorePaymentDisplayModel(paymentModel: string): StorePaymentDisplayModel {
  const key = (paymentModel || "").toUpperCase();
  if (key === "PLATFORM") return "PLATFORM_PAYMENT";
  if (key === "DEALER") return "DEALER_PAYMENT";
  return "MANUAL_ORDER";
}

export const PAYMENT_MODEL_LABELS: Record<StorePaymentDisplayModel, string> = {
  PLATFORM_PAYMENT: "Platform Ödemesi (ENAUNITY)",
  DEALER_PAYMENT: "Bayi Ödemesi",
  MANUAL_ORDER: "Manuel Sipariş",
};

/** Online POS entegrasyonu aktif değil — tüm mağazalarda manuel ödeme akışı */
export const DROPSHIP_ONLINE_PAYMENT_ENABLED = false;

export const MANUAL_PAYMENT_NOTICE =
  "Bu mağazada ödeme sipariş sonrası bayi tarafından alınacaktır.";

export function getCheckoutPaymentNotice(paymentModel: string): {
  displayModel: StorePaymentDisplayModel;
  label: string;
  manualNotice: string | null;
} {
  const displayModel = resolveStorePaymentDisplayModel(paymentModel);
  const label = PAYMENT_MODEL_LABELS[displayModel];
  const manualNotice = DROPSHIP_ONLINE_PAYMENT_ENABLED ? null : MANUAL_PAYMENT_NOTICE;
  return { displayModel, label, manualNotice };
}
