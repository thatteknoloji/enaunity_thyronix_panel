import type { ThyronixAiRules, ThyronixGateRules, ThyronixPriceRules, ThyronixStockRules } from "../src/lib/thyronix/rules/types";

/** Önerilen başlangıç kuralları — fiyat XML ile aynı (×1); panelden özelleştirilir. */
export const STARTER_PACKAGE_RULES = {
  price: {
    mode: "flat" as const,
    multiplier: 1,
    fixedAdjustment: 0,
    tiers: [],
    roundTo: 0,
    baseField: "price" as const,
  } satisfies ThyronixPriceRules,
  stock: {
    // Varsayılan: stok filtresi kapalı — kaynak XML ile aynı ürün seti çıkar.
    // Bayi panelden isterse stok 0 veya özel eşik açabilir.
    hideBelowStock: null,
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

/** @deprecated STARTER_PACKAGE_RULES kullanın */
export const ERSA_GUDU_STARTER_RULES = STARTER_PACKAGE_RULES;
