import type { XmlFeedRules, XmlPriceTier } from "./types";

export const MUSIC_INSTRUMENT_PRICE_TIERS: XmlPriceTier[] = [
  { minPrice: 0, maxPrice: 100, markupPercent: 100 },
  { minPrice: 100, maxPrice: 250, markupPercent: 75 },
  { minPrice: 250, maxPrice: 1000, markupPercent: 50 },
  { minPrice: 1000, maxPrice: null, markupPercent: 25 },
];

export const IKAS_DEFAULT_RULES: Partial<XmlFeedRules> = {
  priceMode: "tiered",
  priceTiers: MUSIC_INSTRUMENT_PRICE_TIERS,
  priceMultiplier: 1.25,
  fixedPriceAdjustment: 0,
  fixedBrand: "",
  stripBrandFromTitle: false,
  stripBrandFromDescription: false,
  brandAliasesFromFeed: false,
};

function roundPrice(value: number, step: number): number {
  if (!step || step <= 0) return Math.round(value * 100) / 100;
  return Math.round(value / step) * step;
}

export function normalizePriceTiers(raw: unknown): XmlPriceTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => {
      if (!t || typeof t !== "object") return null;
      const row = t as Partial<XmlPriceTier>;
      const minPrice = Number(row.minPrice);
      const markupPercent = Number(row.markupPercent);
      if (!Number.isFinite(minPrice) || minPrice < 0) return null;
      if (!Number.isFinite(markupPercent)) return null;
      const maxRaw = row.maxPrice;
      const maxPrice = maxRaw === null || maxRaw === undefined || maxRaw === ""
        ? null
        : Number(maxRaw);
      return {
        minPrice,
        maxPrice: maxPrice !== null && Number.isFinite(maxPrice) ? maxPrice : null,
        markupPercent,
      };
    })
    .filter((t): t is XmlPriceTier => t !== null)
    .sort((a, b) => a.minPrice - b.minPrice);
}

export function tierMultiplierForPrice(basePrice: number, tiers: XmlPriceTier[]): number {
  if (!tiers.length) return 1;
  const sorted = [...tiers].sort((a, b) => a.minPrice - b.minPrice);
  for (const tier of sorted) {
    const max = tier.maxPrice ?? Number.POSITIVE_INFINITY;
    if (basePrice >= tier.minPrice && basePrice < max) {
      return 1 + tier.markupPercent / 100;
    }
  }
  const last = sorted[sorted.length - 1];
  return 1 + (last?.markupPercent ?? 0) / 100;
}

export function applyXmlPriceRule(basePrice: number, rules: XmlFeedRules): number {
  const base = Number(basePrice) || 0;
  const multiplier =
    rules.priceMode === "tiered" && rules.priceTiers.length > 0
      ? tierMultiplierForPrice(base, rules.priceTiers)
      : rules.priceMultiplier;
  const adjusted = base * multiplier + (Number(rules.fixedPriceAdjustment) || 0);
  return Math.max(0, roundPrice(adjusted, rules.roundPriceTo));
}

export function previewPriceSamples(rules: XmlFeedRules, samples = [36, 100, 200, 500, 2040]) {
  return samples.map((base) => ({ base, sale: applyXmlPriceRule(base, rules) }));
}
