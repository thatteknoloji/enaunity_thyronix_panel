import {
  buildVariantMappingReadiness,
  getMissingRequiredMappings,
} from "./mapping-validation";

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

  const mappedFieldCount = Object.keys(fieldMapping).filter((key) => fieldMapping[key]).length;
  const mappedVariantCount = Object.keys(variantMapping).filter((key) => variantMapping[key] && variantMapping[key] !== "variantIgnore").length;
  const missingMappings = getMissingRequiredMappings(fieldMapping);
  const requiredReady = !missingMappings.includes("name") && !missingMappings.includes("price");
  const identityReady = !missingMappings.includes("identity");
  const lastTestedAt = String(fixedValues._lastTestedAt || "");
  const lastTestCount = toNumber(fixedValues._lastTestCount);
  const lastDetectedFieldCount = toNumber(fixedValues._lastDetectedFieldCount);
  const lastVariantFieldCount = toNumber(fixedValues._lastVariantFieldCount);
  const lastValidRows = toNumber(fixedValues._lastValidRows);
  const lastInvalidRows = toNumber(fixedValues._lastInvalidRows);
  const variantFields = String(fixedValues._variantFields || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  const variantReadiness = buildVariantMappingReadiness(
    lastVariantFieldCount && lastVariantFieldCount > 0 ? variantFields.length ? variantFields : ["__detected__"] : [],
    variantMapping,
  );
  const tested = Boolean(lastTestedAt);
  const syncHealthy = !!source.lastSync && !source.errorLog;

  let readiness: "ready" | "partial" | "needs_attention" = "needs_attention";
  if (requiredReady && identityReady && tested && variantReadiness.ready) readiness = "ready";
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
    variantReady: variantReadiness.ready,
    variantMissing: variantReadiness.missing,
    lastTestedAt: lastTestedAt || null,
    lastTestCount,
    lastDetectedFieldCount,
    lastVariantFieldCount,
    lastValidRows,
    lastInvalidRows,
    hasError: Boolean(source.errorLog),
  };
}
