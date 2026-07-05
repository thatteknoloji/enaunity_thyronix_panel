import type { FieldMapping, ImportPresetId } from "./types";

/** Trendyol tablo export (veriler_part1.xlsx canonical headers) */
export const TRENDYOL_TABLO_MAPPING: FieldMapping = {
  name: "Ürün Adı",
  description: "Ürün Açıklaması",
  brand: "Marka",
  category: "Kategori",
  modelCode: "Model Kodu",
  sku: "Stok Kodu",
  barcode: "Barkod",
  price: "Trendyol Satış Fiyatı",
  stock: "Ürün Stok Adedi",
  image: "Görsel 1",
  seoTitle: "SEO Başlık",
  seoDescription: "SEO Açıklama",
  seoKeywords: "SEO Anahtar Kelimeler",
  geoTargets: "GEO Hedefler",
  aeoAnswerSummary: "AEO Özet",
  aeoFaq: "AEO SSS",
  images: ["Görsel 1", "Görsel 2", "Görsel 3", "Görsel 4", "Görsel 5", "Görsel 6", "Görsel 7", "Görsel 8"],
  variantAxes: {
    "Boyut/Ebat": "Boyut/Ebat",
    Renk: "Renk",
    "Web Color": "Web Color",
    "Çerçeve Tipi": "Çerçeve Tipi",
  },
};

/** Hepsiburada — same 46-col TY puzzle export; alias mapping until distinct HB schema */
export const HEPSIBURADA_MAPPING: FieldMapping = {
  ...TRENDYOL_TABLO_MAPPING,
  price: "Trendyol Satış Fiyatı",
};

export const GENERIC_MAPPING: FieldMapping = {
  name: "name",
  description: "description",
  brand: "brand",
  category: "category",
  modelCode: "modelCode",
  sku: "sku",
  barcode: "barcode",
  price: "price",
  stock: "stock",
  image: "image",
  seoTitle: "seoTitle",
  seoDescription: "seoDescription",
  seoKeywords: "seoKeywords",
  geoTargets: "geoTargets",
  aeoAnswerSummary: "aeoAnswerSummary",
  aeoFaq: "aeoFaq",
};

export function getPresetMapping(preset: ImportPresetId): FieldMapping {
  switch (preset) {
    case "trendyol_tablo":
      return TRENDYOL_TABLO_MAPPING;
    case "hepsiburada":
      return HEPSIBURADA_MAPPING;
    default:
      return GENERIC_MAPPING;
  }
}

/** Auto-detect preset from column headers */
export function detectPreset(columns: string[]): ImportPresetId {
  const set = new Set(columns.map((c) => c.trim()));
  if (set.has("Model Kodu") && set.has("Barkod") && set.has("Stok Kodu")) {
    return "trendyol_tablo";
  }
  if (set.has("MerchantSku") && set.has("ModelCode")) {
    return "hepsiburada";
  }
  return "generic";
}

/** Merge user overrides onto preset */
export function mergeMapping(preset: ImportPresetId, overrides: Partial<FieldMapping>): FieldMapping {
  const base = getPresetMapping(preset);
  return {
    ...base,
    ...overrides,
    images: overrides.images ?? base.images,
    variantAxes: { ...base.variantAxes, ...overrides.variantAxes },
  };
}
