export type ThyronixPriceTier = {
  minPrice: number;
  maxPrice: number | null;
  markupPercent: number;
};

export type ThyronixPriceRules = {
  mode: "flat" | "tiered";
  multiplier: number;
  fixedAdjustment: number;
  tiers: ThyronixPriceTier[];
  roundTo: number;
  baseField: "price" | "costPrice" | "discountedPrice";
};

export type ThyronixStockRules = {
  /** Çıktı XML'den gizle (DB'de kalır) */
  hideBelowStock: number | null;
  lowStockWarning: number | null;
};

export type ThyronixGateRules = {
  requireImage: boolean;
  requireDescription: boolean;
  requireBarcode: boolean;
  requireCategory: boolean;
};

export type ThyronixAiRules = {
  enabled: boolean;
  stripBrandFromTitle: boolean;
  titlePrefix: string;
  titleSuffix: string;
  descriptionPrefix: string;
  descriptionSuffix: string;
  bannedWords: string[];
};

export type ThyronixRulesBundle = {
  price: ThyronixPriceRules;
  stock: ThyronixStockRules;
  gate: ThyronixGateRules;
  ai: ThyronixAiRules;
  outputFormat: string | null;
};

export const DEFAULT_THYRONIX_PRICE_RULES: ThyronixPriceRules = {
  mode: "flat",
  multiplier: 1,
  fixedAdjustment: 0,
  tiers: [],
  roundTo: 0,
  baseField: "price",
};

export const DEFAULT_THYRONIX_STOCK_RULES: ThyronixStockRules = {
  hideBelowStock: null,
  lowStockWarning: null,
};

export const DEFAULT_THYRONIX_GATE_RULES: ThyronixGateRules = {
  requireImage: false,
  requireDescription: false,
  requireBarcode: false,
  requireCategory: false,
};

export const DEFAULT_THYRONIX_AI_RULES: ThyronixAiRules = {
  enabled: false,
  stripBrandFromTitle: true,
  titlePrefix: "",
  titleSuffix: "",
  descriptionPrefix: "",
  descriptionSuffix: "",
  bannedWords: [],
};

export function defaultRulesBundle(): ThyronixRulesBundle {
  return {
    price: { ...DEFAULT_THYRONIX_PRICE_RULES },
    stock: { ...DEFAULT_THYRONIX_STOCK_RULES },
    gate: { ...DEFAULT_THYRONIX_GATE_RULES },
    ai: { ...DEFAULT_THYRONIX_AI_RULES },
    outputFormat: null,
  };
}
