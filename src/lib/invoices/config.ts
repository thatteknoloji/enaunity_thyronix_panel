export type InvoiceEngine = "invoice_model" | "order_pdf";

export const INVOICE_SOURCE_TYPES = ["B2B", "MARKETPLACE", "MANUAL"] as const;
export type InvoiceSourceType = (typeof INVOICE_SOURCE_TYPES)[number];

export const INVOICE_PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID", "REFUNDED"] as const;
export type InvoicePaymentStatus = (typeof INVOICE_PAYMENT_STATUSES)[number];

export const FINANCIAL_TX_TYPES = ["INVOICE", "PAYMENT", "REFUND", "ADJUSTMENT"] as const;
export type FinancialTxType = (typeof FINANCIAL_TX_TYPES)[number];

export function getInvoiceEngine(): InvoiceEngine {
  const engine = (process.env.INVOICE_ENGINE || "invoice_model").toLowerCase();
  return engine === "order_pdf" ? "order_pdf" : "invoice_model";
}

export function isInvoiceModelEngine(): boolean {
  return getInvoiceEngine() === "invoice_model";
}

export function isLegacyOrderPdfEnabled(): boolean {
  if (process.env.LEGACY_ORDER_PDF_ENABLED === "true") return true;
  if (process.env.LEGACY_ORDER_PDF_ENABLED === "false") return false;
  return getInvoiceEngine() === "order_pdf";
}

export function normalizeInvoiceSourceType(sourceType?: string, marketplace?: string): InvoiceSourceType {
  const st = (sourceType || "").toUpperCase();
  if (st === "MARKETPLACE" || st === "HUB_MARKETPLACE" || marketplace) return "MARKETPLACE";
  if (st === "B2B" || st === "MANUAL") return st === "MANUAL" ? "MANUAL" : "B2B";
  return marketplace ? "MARKETPLACE" : "B2B";
}
