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
    // 0 stok gizlensin; 1+ çıksın (eski 3 eşiği birçok firmayı boşaltıyordu)
    hideBelowStock: 1,
    lowStockWarning: 3,
  } satisfies ThyronixStockRules,
  gate: {
    // Sıkı gate (image+desc+barcode+category+vat+variants) bazı VHT kaynaklarını
    // tamamen 0 çıktıya düşürüyordu. Panelden istenirse tekrar sıkılaştırılır.
    requireImage: false,
    requireDescription: false,
    requireBarcode: false,
    requireCategory: false,
    requireVatRate: false,
    requireVariants: false,
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
