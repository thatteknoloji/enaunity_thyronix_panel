export type OrderPaymentMethod =
  | "DEALER_ACCOUNT"
  | "BANK_TRANSFER"
  | "ESNEKPOS"
  | "IYZICO"
  | "";

export type OrderPaymentInfo = {
  method: OrderPaymentMethod;
  label: string;
  locked: boolean;
};

function parseJson(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function getOrderPaymentInfo(order: { metadataJson?: string | null }): OrderPaymentInfo {
  const metadata = parseJson(order.metadataJson);
  const raw = String(metadata.paymentMethod || "").toUpperCase();
  const method = (
    raw === "DEALER_ACCOUNT" || raw === "BANK_TRANSFER" || raw === "ESNEKPOS" || raw === "IYZICO"
      ? raw
      : ""
  ) as OrderPaymentMethod;

  const labels: Record<Exclude<OrderPaymentMethod, "">, string> = {
    DEALER_ACCOUNT: "Bakiye / Cari Hesap",
    BANK_TRANSFER: "Havale / EFT",
    ESNEKPOS: "EsnekPOS",
    IYZICO: "İyzico",
  };

  return {
    method,
    label: method ? labels[method] : "Belirsiz",
    locked: method === "DEALER_ACCOUNT" || method === "BANK_TRANSFER" || method === "ESNEKPOS" || method === "IYZICO",
  };
}

