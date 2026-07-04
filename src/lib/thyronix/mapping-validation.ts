export const REQUIRED_PRODUCT_TARGETS = ["name", "price"] as const;
export const IDENTITY_TARGETS = ["barcode", "stockCode", "modelCode", "externalId"] as const;

const VARIANT_HINT_RE = /(varyant|variant|renk|color|colour|beden|size|ebat|olcu|ölçü|desen|pattern|numara|option|attribute|secenek|seçenek)/i;
const AUTO_VARIANT_VALUE_RE = /(eksecenekozellik|ozellik|özellik|option|attribute)/i;

export type VariantReadiness = {
  detected: boolean;
  ready: boolean;
  mappedCount: number;
  missing: string[];
};

export function getMappedTargets(mapping: Record<string, string>) {
  return new Set(Object.values(mapping).filter(Boolean));
}

export function getMissingRequiredMappings(mapping: Record<string, string>) {
  const mappedTargets = getMappedTargets(mapping);
  const missing: string[] = [];
  for (const field of REQUIRED_PRODUCT_TARGETS) {
    if (!mappedTargets.has(field)) missing.push(field);
  }
  if (!IDENTITY_TARGETS.some((field) => mappedTargets.has(field))) {
    missing.push("identity");
  }
  return missing;
}

export function mappingErrorLabel(key: string) {
  if (key === "name") return "Ürün adı";
  if (key === "price") return "Fiyat";
  if (key === "identity") return "Kimlik alanı (barkod / stok kodu / model kodu / harici ID)";
  if (key === "variantValue") return "Varyant değeri";
  if (key === "variantIdentity") return "Varyant barkod veya SKU";
  return key;
}

export function inferVariantFieldsFromColumns(columns: string[]) {
  return columns.filter((column) => VARIANT_HINT_RE.test(column));
}

export function buildVariantMappingReadiness(
  variantFields: string[],
  variantMapping: Record<string, string>,
): VariantReadiness {
  const roles = Object.values(variantMapping).filter((role) => role && role !== "variantIgnore");
  const mappedCount = roles.length;
  const detected = variantFields.length > 0 || mappedCount > 0;
  const missing: string[] = [];

  if (!detected) {
    return { detected: false, ready: true, mappedCount, missing };
  }

  const hasAutoVariantValue = variantFields.some((field) => AUTO_VARIANT_VALUE_RE.test(field));
  if (!roles.includes("variantValue") && !hasAutoVariantValue) {
    missing.push("variantValue");
  }
  if (!roles.includes("variantBarcode") && !roles.includes("variantSku")) {
    missing.push("variantIdentity");
  }

  return {
    detected,
    ready: missing.length === 0,
    mappedCount,
    missing,
  };
}
