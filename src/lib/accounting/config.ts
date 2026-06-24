export type AccountingEngine = "dealer_account" | "legacy_balance";

export const ACCOUNT_TRANSACTION_TYPES = [
  "ORDER_COST",
  "INVOICE",
  "PAYMENT",
  "REFUND",
  "ADJUSTMENT",
  "MANUAL_ADJUSTMENT",
  "SERVICE_FEE",
  "SHIPPING_FEE",
  "PACKAGING_FEE",
  "MODULE_PAYMENT",
  "PRODUCT_PACKAGE_PAYMENT",
  "TOPUP_CARD",
  "TOPUP_BANK",
] as const;

export type AccountTransactionType = (typeof ACCOUNT_TRANSACTION_TYPES)[number];

export function getAccountingEngine(): AccountingEngine {
  const engine = (process.env.ACCOUNTING_ENGINE || "dealer_account").toLowerCase();
  return engine === "legacy_balance" ? "legacy_balance" : "dealer_account";
}

export function isDealerAccountEngine(): boolean {
  return getAccountingEngine() === "dealer_account";
}

export function isLegacyBalanceEnabled(): boolean {
  if (process.env.LEGACY_DEALER_BALANCE_ENABLED === "true") return true;
  if (process.env.LEGACY_DEALER_BALANCE_ENABLED === "false") return false;
  return getAccountingEngine() === "legacy_balance";
}

export function shouldMirrorLegacyTransaction(): boolean {
  return isLegacyBalanceEnabled() || isDealerAccountEngine();
}
