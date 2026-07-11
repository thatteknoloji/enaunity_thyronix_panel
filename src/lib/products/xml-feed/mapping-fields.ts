import {
  DEFAULT_FIELD_MAPPINGS,
  DEFAULT_VARIANT_MAPPINGS,
} from "./templates";
import { DEFAULT_XML_FEED_RULES, type XmlFeedRules, type XmlFeedTemplateId } from "./types";

export type MappingFieldDef = {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
};

export const PRODUCT_MAPPING_FIELDS: MappingFieldDef[] = [
  { key: "modelCode", label: "Model Kodu", required: true, hint: "Parent ürün gruplama anahtarı" },
  { key: "name", label: "Ürün Adı", required: true },
  { key: "description", label: "Açıklama" },
  { key: "brand", label: "Marka (kaynak)" },
  { key: "category", label: "Kategori" },
  { key: "barcode", label: "Barkod" },
  { key: "priceBase", label: "Alış / Baz Fiyat", required: true, hint: "Kural çarpanı bu fiyata uygulanır" },
  { key: "listPrice", label: "Liste Fiyatı" },
  { key: "stock", label: "Stok" },
  { key: "externalId", label: "Harici ID" },
  { key: "vatRate", label: "KDV Oranı" },
  { key: "currency", label: "Para Birimi" },
  { key: "image1", label: "Görsel 1" },
  { key: "image2", label: "Görsel 2" },
  { key: "image3", label: "Görsel 3" },
  { key: "image4", label: "Görsel 4" },
  { key: "image5", label: "Görsel 5" },
];

export const VARIANT_MAPPING_FIELDS: MappingFieldDef[] = [
  { key: "variantOption1Name", label: "Varyant Eksen 1 Adı", hint: "Örn. name1 (Beden)" },
  { key: "variantOption1Value", label: "Varyant Eksen 1 Değer", hint: "Örn. value1 (XL)" },
  { key: "variantOption2Name", label: "Varyant Eksen 2 Adı", hint: "Örn. name2 (Renk)" },
  { key: "variantOption2Value", label: "Varyant Eksen 2 Değer", hint: "Örn. value2 (Siyah)" },
  { key: "variantBarcode", label: "Varyant Barkod" },
  { key: "variantSku", label: "Varyant SKU" },
  { key: "variantStock", label: "Varyant Stok" },
  { key: "variantPriceBase", label: "Varyant Baz Fiyat" },
  { key: "variantImage", label: "Varyant Görsel" },
];

export const REQUIRED_PRODUCT_MAPPING_KEYS = PRODUCT_MAPPING_FIELDS.filter((f) => f.required).map((f) => f.key);

export type RuleFieldMeta =
  | { key: keyof XmlFeedRules; label: string; type: "text" | "number" | "boolean" | "select" | "textarea"; options?: { value: string; label: string }[]; hint?: string }
  | { key: keyof XmlFeedRules; label: string; type: "number"; min?: number; max?: number; step?: number; hint?: string };

export const RULES_FIELD_META: RuleFieldMeta[] = [
  { key: "priceSource", label: "Fiyat Kaynağı", type: "select", options: [
    { value: "realPrice", label: "realPrice (alış)" },
    { value: "price", label: "price" },
    { value: "listPrice", label: "listPrice (liste)" },
  ], hint: "XML'deki hangi fiyat alanı baz alınacak" },
  { key: "priceMultiplier", label: "Fiyat Çarpanı", type: "number", min: 0.01, max: 10, step: 0.01, hint: "Örn. 1.25 = %25 zam" },
  { key: "roundPriceTo", label: "Fiyat Yuvarlama (₺)", type: "number", min: 0, step: 0.01, hint: "0 = kuruş hassasiyeti" },
  { key: "fixedBrand", label: "Sabit Marka", type: "text", hint: "Tüm ürünlere yazılacak marka" },
  { key: "stripBrandFromTitle", label: "Başlıktan Marka Temizle", type: "boolean" },
  { key: "stripBrandFromDescription", label: "Açıklamadan Marka Temizle", type: "boolean" },
  { key: "brandAliasesFromFeed", label: "Feed Markalarını Alias Olarak Kullan", type: "boolean" },
  { key: "extraBrandAliases", label: "Ek Marka Alias (satır satır)", type: "textarea" },
  { key: "titlePrefix", label: "Başlık Öneki", type: "text" },
  { key: "titleSuffix", label: "Başlık Soneki", type: "text" },
  { key: "updateStockOnSync", label: "Sync'te Stok Güncelle", type: "boolean" },
  { key: "updateImagesOnSync", label: "Sync'te Görselleri Güncelle", type: "boolean" },
  { key: "autoCreateCategories", label: "Eksik Kategorileri Oluştur", type: "boolean" },
  { key: "deactivateMissing", label: "Feed'de Olmayan Ürünleri Pasifleştir", type: "boolean" },
];

export function getDefaultMappingsForTemplate(templateId: string): {
  mapping: Record<string, string>;
  variantMapping: Record<string, string>;
} {
  const id = (templateId in DEFAULT_FIELD_MAPPINGS ? templateId : "custom") as XmlFeedTemplateId;
  if (id === "custom") {
    return { mapping: {}, variantMapping: {} };
  }
  return {
    mapping: { ...DEFAULT_FIELD_MAPPINGS[id] },
    variantMapping: { ...DEFAULT_VARIANT_MAPPINGS[id] },
  };
}

export function getDefaultRules(): XmlFeedRules {
  return { ...DEFAULT_XML_FEED_RULES };
}

export function validateProductMapping(mapping: Record<string, string>, templateId?: string): string[] {
  if (templateId === "ikas") return [];
  const errors: string[] = [];
  for (const key of REQUIRED_PRODUCT_MAPPING_KEYS) {
    if (!String(mapping[key] || "").trim()) {
      const field = PRODUCT_MAPPING_FIELDS.find((f) => f.key === key);
      errors.push(`${field?.label || key} eşlemesi zorunlu`);
    }
  }
  return errors;
}

export function rulesFromForm(
  rules: XmlFeedRules,
  extraBrandAliasesText: string,
): XmlFeedRules {
  const aliases = extraBrandAliasesText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return { ...rules, extraBrandAliases: aliases };
}

export function extraBrandAliasesToText(aliases: string[]): string {
  return (aliases || []).join("\n");
}

export function formatRulesSummary(rules: XmlFeedRules): string {
  if (rules.priceMode === "tiered" && rules.priceTiers.length) {
    const first = rules.priceTiers[0];
    const last = rules.priceTiers[rules.priceTiers.length - 1];
    const adj = rules.fixedPriceAdjustment
      ? ` ${rules.fixedPriceAdjustment > 0 ? "+" : ""}${rules.fixedPriceAdjustment}₺`
      : "";
    return `Kademeli marj ${first.minPrice}-${last.maxPrice ?? "∞"}₺${adj}`;
  }
  return `Fiyat ×${rules.priceMultiplier}${rules.fixedPriceAdjustment ? ` ${rules.fixedPriceAdjustment > 0 ? "+" : ""}${rules.fixedPriceAdjustment}₺` : ""} · Marka: ${rules.fixedBrand || "feed"}`;
}
