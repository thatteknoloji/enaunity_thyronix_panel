import type { ThyronixAiRules, ThyronixGateRules, ThyronixPriceRules, ThyronixStockRules } from "../src/lib/thyronix/rules/types";

/** Ersa Güdü başlangıç kuralları — panelden sonra ince ayar yapılabilir. */
export const ERSA_GUDU_STARTER_RULES = {
  price: {
    mode: "flat" as const,
    multiplier: 2.5,
    fixedAdjustment: 0,
    tiers: [],
    roundTo: 0,
    baseField: "price" as const,
  } satisfies ThyronixPriceRules,
  stock: {
    hideBelowStock: 3,
    lowStockWarning: 3,
  } satisfies ThyronixStockRules,
  gate: {
    requireImage: true,
    requireDescription: true,
    requireBarcode: true,
    requireCategory: true,
    requireVatRate: true,
    requireVariants: true,
  } satisfies ThyronixGateRules,
  ai: {
    enabled: false,
    autoOnNewProducts: false,
    stripBrandFromTitle: true,
    titlePrefix: "",
    titleSuffix: "",
    descriptionPrefix: "",
    descriptionSuffix: "",
    bannedWords: ["çakma", "taklit", "replika", "muadil"],
  } satisfies ThyronixAiRules,
};
