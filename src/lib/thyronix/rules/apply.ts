import type { ThyronixPriceRules } from "./types";
import { applyPriceRules } from "./resolver";

function parseMetadata(raw?: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function pickPriceBase(row: Record<string, unknown>, rules: ThyronixPriceRules): number {
  const field = rules.baseField;
  const fromField = Number(row[field]);
  if (Number.isFinite(fromField) && fromField > 0) return fromField;
  const price = Number(row.price);
  if (Number.isFinite(price) && price > 0) return price;
  const cost = Number(row.costPrice);
  if (Number.isFinite(cost) && cost > 0) return cost;
  return 0;
}

/** Sync öncesi feed fiyatını kural motorundan geçirir; ham fiyat metadata'da saklanır. */
export function applyIncomingPriceRules(
  row: Record<string, unknown>,
  priceRules: ThyronixPriceRules,
): Record<string, unknown> {
  const feedPrice = Number(row.price) || 0;
  const feedCost = row.costPrice != null ? Number(row.costPrice) : null;
  const feedDiscounted =
    row.discountedPrice != null ? Number(row.discountedPrice) : null;
  const base = pickPriceBase(row, priceRules);
  const calculated = applyPriceRules(base, priceRules);

  const meta = parseMetadata(row.metadataJson != null ? String(row.metadataJson) : null);
  meta._feedPrice = feedPrice;
  if (feedCost != null) meta._feedCostPrice = feedCost;
  if (feedDiscounted != null) meta._feedDiscountedPrice = feedDiscounted;
  meta._priceRuleBase = base;
  meta._priceRuleAppliedAt = new Date().toISOString();

  return {
    ...row,
    price: calculated,
    metadataJson: JSON.stringify(meta),
  };
}

export function applyIncomingPriceRulesBatch(
  rows: Record<string, unknown>[],
  priceRules: ThyronixPriceRules,
): Record<string, unknown>[] {
  return rows.map((row) => applyIncomingPriceRules(row, priceRules));
}
