export const REQUIRED_PRODUCT_TARGETS = ["name", "price"] as const;
export const IDENTITY_TARGETS = ["barcode", "stockCode", "modelCode", "externalId"] as const;

const VARIANT_HINT_RE = /(varyant|variant|renk|color|colour|beden|size|ebat|olcu|ölçü|desen|pattern|numara|option|attribute|secenek|seçenek)/i;

export type VariantReadiness = {
  detected: boolean;
  ready: boolean;
  mappedCount: number;
  missing: string[];
};

export function getMappedTargets(mapping: Record<string, string>) {
  return new Set(Object.values(mapping).filter(Boolean));
}

export function parseMappingRecord(value: unknown): Record<string, string> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, string>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed as Record<string, string> : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function reverseTargetFieldMap(fieldMap?: Record<string, string | undefined>) {
  const mapping: Record<string, string> = {};
  for (const [target, sourceField] of Object.entries(fieldMap || {})) {
    if (sourceField) mapping[String(sourceField)] = target;
  }
  return mapping;
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

  if (!roles.includes("variantValue")) {
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

export function getStoredVariantFields(fixedValues: Record<string, string>) {
  return String(fixedValues._variantFields || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function validateSourceMappingConfig(input: {
  sourceType: string;
  fieldMapping: unknown;
  variantMapping: unknown;
  fixedValues: unknown;
  templateFieldMap?: Record<string, string | undefined>;
}) {
  const sourceType = String(input.sourceType || "xml");
  const fieldMapping = parseMappingRecord(input.fieldMapping);
  const variantMapping = parseMappingRecord(input.variantMapping);
  const fixedValues = parseMappingRecord(input.fixedValues);
  const effectiveFieldMapping = {
    ...(sourceType === "xml" ? reverseTargetFieldMap(input.templateFieldMap) : {}),
    ...fieldMapping,
  };

  const errors: string[] = [];
  if (["xml", "excel", "csv"].includes(sourceType)) {
    const missing = getMissingRequiredMappings(effectiveFieldMapping);
    if (missing.length > 0) {
      errors.push(`Eksik eşleştirme: ${missing.map(mappingErrorLabel).join(", ")}`);
    }
  }

  const lastVariantCount = Number(fixedValues._lastVariantFieldCount || 0);
  const storedVariantFields = getStoredVariantFields(fixedValues);
  const variantReadiness = buildVariantMappingReadiness(
    lastVariantCount > 0 ? storedVariantFields.length ? storedVariantFields : ["__detected__"] : [],
    variantMapping,
  );
  if (variantReadiness.detected && !variantReadiness.ready) {
    errors.push(`Varyant eşleştirmesi eksik: ${variantReadiness.missing.map(mappingErrorLabel).join(", ")}`);
  }

  return {
    ready: errors.length === 0,
    errors,
    fieldMapping,
    variantMapping,
    fixedValues,
    effectiveFieldMapping,
    variantReadiness,
  };
}
