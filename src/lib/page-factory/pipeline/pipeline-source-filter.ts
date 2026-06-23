export type PipelineGenerationSource =
  | "ALL"
  | "PRODUCT_UNIVERSE_V2"
  | "GEO_UNIVERSE"
  | "MANUAL"
  | "LEGACY";

export const PIPELINE_GENERATION_SOURCE_OPTIONS: Array<{
  value: PipelineGenerationSource;
  label: string;
}> = [
  { value: "ALL", label: "Tümü (ALL)" },
  { value: "PRODUCT_UNIVERSE_V2", label: "Product Universe" },
  { value: "GEO_UNIVERSE", label: "GEO / Universe" },
  { value: "MANUAL", label: "Manuel" },
  { value: "LEGACY", label: "Legacy / Tanımsız" },
];

const GEO_PAGE_TYPES = new Set([
  "GEO",
  "LOCATION",
  "QUESTION",
  "INTENT",
  "CATEGORY",
  "PRODUCT_GEO",
  "PRODUCT_INTENT",
  "PRODUCT_FAQ",
  "FAQ",
]);

const PRODUCT_UNIVERSE_MARKERS = [
  "PRODUCT_UNIVERSE",
  "PRODUCT_UNIVERSE_V2",
  "PRODUCT_UNIVERSE_BATCH_V1",
  "UNIVERSE_GENERATOR_V1",
  "PAGE_FACTORY_UNIVERSE_GENERATOR_V1",
  "THYRONIX_BRIDGE",
];

export function resolveGenerationSourceFilter(raw?: string | null): PipelineGenerationSource {
  const v = String(raw || "ALL").toUpperCase();
  if (v === "ALL" || v === "") return "ALL";
  if (v === "PRODUCT_UNIVERSE_V2" || v === "PRODUCT_UNIVERSE_BATCH_V1") return "PRODUCT_UNIVERSE_V2";
  if (v === "UNIVERSE_GENERATOR_V1" || v === "PAGE_FACTORY_UNIVERSE_GENERATOR_V1") return "PRODUCT_UNIVERSE_V2";
  if (v === "GEO_UNIVERSE" || v === "BLUEPRINT_UNIVERSE_V2") return "GEO_UNIVERSE";
  if (v === "MANUAL") return "MANUAL";
  if (v === "LEGACY") return "LEGACY";
  return "ALL";
}

export function extractBlueprintSource(metadata: Record<string, unknown>): string {
  return String(
    metadata.generationSource ||
      metadata.source ||
      metadata.importSource ||
      metadata.createdBy ||
      ""
  ).trim();
}

export function isBlueprintPipelineEligible(metadata: Record<string, unknown>): boolean {
  const status = String(metadata.status || metadata.contentStatus || "DRAFT").toUpperCase();
  return status !== "REJECTED";
}

export function matchesGenerationSource(
  filter: PipelineGenerationSource,
  metadata: Record<string, unknown>,
  pageType: string
): boolean {
  if (filter === "ALL") return true;

  const src = extractBlueprintSource(metadata).toUpperCase();
  const kind = String(metadata.blueprintKind || metadata.blueprintType || "").toUpperCase();
  const pt = String(pageType || "").toUpperCase();

  if (filter === "PRODUCT_UNIVERSE_V2") {
    if (metadata.productUniverseId || metadata.productId) return true;
    if (PRODUCT_UNIVERSE_MARKERS.some((m) => src.includes(m))) return true;
    if (kind.startsWith("PRODUCT_")) return true;
    return false;
  }

  if (filter === "GEO_UNIVERSE") {
    if (GEO_PAGE_TYPES.has(pt) || GEO_PAGE_TYPES.has(kind)) return true;
    if (src.includes("GEO") || src.includes("UNIVERSE") || src.includes("BLUEPRINT")) return true;
    if (metadata.geoPath || metadata.geoTarget) return true;
    return false;
  }

  if (filter === "MANUAL") {
    return src === "MANUAL" || metadata.generationSource === "MANUAL";
  }

  if (filter === "LEGACY") {
    if (!src) return true;
    const isProduct = PRODUCT_UNIVERSE_MARKERS.some((m) => src.includes(m)) || metadata.productId;
    const isGeo = GEO_PAGE_TYPES.has(pt) || GEO_PAGE_TYPES.has(kind) || src.includes("GEO");
    const isManual = src === "MANUAL";
    return !isProduct && !isGeo && !isManual;
  }

  return src === filter || String(metadata.generationSource || "") === filter;
}
