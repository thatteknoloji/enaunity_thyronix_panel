import { prisma } from "@/lib/db";
import {
  defaultRulesBundle,
  type ThyronixAiRules,
  type ThyronixGateRules,
  type ThyronixPriceRules,
  type ThyronixRulesBundle,
  type ThyronixStockRules,
} from "./types";

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? ({ ...fallback, ...parsed } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function profileToRulesBundle(profile: {
  priceRulesJson: string;
  stockRulesJson: string;
  gateRulesJson: string;
  aiRulesJson: string;
  outputFormat: string | null;
}): ThyronixRulesBundle {
  const base = defaultRulesBundle();
  return {
    price: parseJson<ThyronixPriceRules>(profile.priceRulesJson, base.price),
    stock: parseJson<ThyronixStockRules>(profile.stockRulesJson, base.stock),
    gate: parseJson<ThyronixGateRules>(profile.gateRulesJson, base.gate),
    ai: parseJson<ThyronixAiRules>(profile.aiRulesJson, base.ai),
    outputFormat: profile.outputFormat,
  };
}

export async function resolveRulesForSource(sourceId: string): Promise<ThyronixRulesBundle> {
  const source = await prisma.thyronixSource.findUnique({
    where: { id: sourceId },
    include: { rulesProfile: true },
  });
  if (!source) return defaultRulesBundle();

  if (source.useCustomRules && source.rulesProfile) {
    return profileToRulesBundle(source.rulesProfile);
  }

  const globalProfile = await prisma.thyronixRulesProfile.findFirst({
    where: {
      dealerId: source.dealerId,
      scope: "global",
      isDefault: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (globalProfile) return profileToRulesBundle(globalProfile);
  return defaultRulesBundle();
}

export function tierMultiplierForPrice(basePrice: number, tiers: ThyronixPriceRules["tiers"]): number {
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

export function applyPriceRules(basePrice: number, rules: ThyronixPriceRules): number {
  const base = Number(basePrice) || 0;
  const multiplier =
    rules.mode === "tiered" && rules.tiers.length > 0
      ? tierMultiplierForPrice(base, rules.tiers)
      : rules.multiplier;
  let value = base * multiplier + (Number(rules.fixedAdjustment) || 0);
  if (rules.roundTo > 0) {
    value = Math.round(value / rules.roundTo) * rules.roundTo;
  }
  return Math.max(0, Math.round(value * 100) / 100);
}

export function shouldHideFromOutput(stock: number, rules: ThyronixStockRules): boolean {
  if (rules.hideBelowStock == null) return false;
  return stock < rules.hideBelowStock;
}

function hasProductImage(product: {
  image?: string | null;
  images?: string | null;
}): boolean {
  if (String(product.image || "").trim()) return true;
  const raw = String(product.images || "").trim();
  if (!raw) return false;
  if (raw.startsWith("http")) return true;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.some((v) => String(v || "").trim().startsWith("http"));
  } catch {
    /* fall through */
  }
  return raw.includes("http");
}

export function passesQualityGate(product: {
  image?: string | null;
  images?: string | null;
  description?: string | null;
  barcode?: string | null;
  category?: string | null;
  vatRate?: number | null;
  variantData?: string | null;
  stock?: number | null;
  price?: number | null;
}, rules: ThyronixGateRules): boolean {
  const hasCompleteVariants = (() => {
    if (!rules.requireVariants) return true;
    const raw = String(product.variantData || "").trim();
    if (!raw) {
      const barcode = String(product.barcode || "").trim();
      const stock = Number(product.stock);
      const price = Number(product.price);
      return barcode && Number.isFinite(stock) && stock >= 0 && Number.isFinite(price) && price > 0;
    }
    try {
      const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
      if (!Array.isArray(parsed) || parsed.length === 0) return false;
      return parsed.every((variant) => {
        const barcode = String(variant.barcode || product.barcode || "").trim();
        const stock = Number(variant.stock ?? product.stock);
        const price = Number(variant.price ?? product.price);
        return barcode && Number.isFinite(stock) && stock >= 0 && Number.isFinite(price) && price > 0;
      });
    } catch {
      return false;
    }
  })();
  if (rules.requireImage && !hasProductImage(product)) return false;
  if (rules.requireDescription && !String(product.description || "").trim()) return false;
  if (rules.requireBarcode && !String(product.barcode || "").trim()) return false;
  if (rules.requireCategory && !String(product.category || "").trim()) return false;
  if (
    rules.requireVatRate &&
    (product.vatRate == null || String(product.vatRate).trim() === "" || !Number.isFinite(Number(product.vatRate)))
  ) {
    return false;
  }
  if (!hasCompleteVariants) return false;
  return true;
}

export function stripBrandFromTitle(title: string, brand?: string | null): string {
  let out = title.trim();
  if (brand && brand.trim()) {
    out = out.replace(new RegExp(brand.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  }
  return out.replace(/\s+/g, " ").trim();
}
