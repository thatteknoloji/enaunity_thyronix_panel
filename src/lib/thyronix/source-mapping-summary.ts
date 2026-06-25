const REQUIRED_TARGETS = ["name", "price"] as const;
const IDENTITY_TARGETS = ["barcode", "stockCode", "modelCode", "externalId"] as const;

function parseJsonRecord(value: string | null | undefined): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildSourceMappingSummary(source: {
  type: string;
  fieldMapping?: string | null;
  variantMapping?: string | null;
  fixedValues?: string | null;
  lastSync?: Date | string | null;
  errorLog?: string | null;
}) {
  const fieldMapping = parseJsonRecord(source.fieldMapping);
  const variantMapping = parseJsonRecord(source.variantMapping);
  const fixedValues = parseJsonRecord(source.fixedValues);

  const mappedTargets = new Set(Object.values(fieldMapping).filter(Boolean).map(String));
  const mappedFieldCount = Object.keys(fieldMapping).filter((key) => fieldMapping[key]).length;
  const mappedVariantCount = Object.keys(variantMapping).filter((key) => variantMapping[key] && variantMapping[key] !== "variantIgnore").length;
  const requiredReady = REQUIRED_TARGETS.every((field) => mappedTargets.has(field));
  const identityReady = IDENTITY_TARGETS.some((field) => mappedTargets.has(field));
  const lastTestedAt = String(fixedValues._lastTestedAt || "");
  const lastTestCount = toNumber(fixedValues._lastTestCount);
  const lastDetectedFieldCount = toNumber(fixedValues._lastDetectedFieldCount);
  const lastVariantFieldCount = toNumber(fixedValues._lastVariantFieldCount);
  const lastValidRows = toNumber(fixedValues._lastValidRows);
  const lastInvalidRows = toNumber(fixedValues._lastInvalidRows);
  const tested = Boolean(lastTestedAt);
  const syncHealthy = !!source.lastSync && !source.errorLog;

  let readiness: "ready" | "partial" | "needs_attention" = "needs_attention";
  if (requiredReady && identityReady && tested) readiness = "ready";
  else if (mappedFieldCount > 0 || tested || syncHealthy) readiness = "partial";

  if (source.type === "xml" && mappedFieldCount === 0 && tested) {
    readiness = "partial";
  }

  return {
    readiness,
    tested,
    syncHealthy,
    mappedFieldCount,
    mappedVariantCount,
    requiredReady,
    identityReady,
    lastTestedAt: lastTestedAt || null,
    lastTestCount,
    lastDetectedFieldCount,
    lastVariantFieldCount,
    lastValidRows,
    lastInvalidRows,
    hasError: Boolean(source.errorLog),
  };
}
