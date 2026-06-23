import type {
  UniverseGenerationMode,
  UniverseGeneratorFilters,
  UniverseProductSourceFilters,
  UniverseSourceType,
} from "@/lib/page-factory/universe/universe-types";

export function parseUniverseProductFilters(
  body: Record<string, unknown>,
  query?: URLSearchParams
): UniverseProductSourceFilters {
  const get = (key: string) => {
    if (query?.has(key)) return query.get(key);
    return body[key];
  };

  return {
    projectId: get("projectId") ? String(get("projectId")) : undefined,
    sourceType: (get("sourceType") ? String(get("sourceType")) : "ALL") as UniverseSourceType,
    productIds: Array.isArray(body.productIds)
      ? body.productIds.map(String)
      : get("productIds")
        ? String(get("productIds"))
            .split(/[,\s]+/)
            .filter(Boolean)
        : undefined,
    minQualityScore: get("minQualityScore") != null ? Number(get("minQualityScore")) : 0,
    limit: get("limit") != null ? Number(get("limit")) : undefined,
    brand: get("brand") ? String(get("brand")) : undefined,
    category: get("category") ? String(get("category")) : undefined,
    hasImage: get("hasImage") === true || get("hasImage") === "true",
    status: get("status") ? String(get("status")) : undefined,
  };
}

export function parseUniverseFilters(body: Record<string, unknown>): UniverseGeneratorFilters {
  const base = parseUniverseProductFilters(body);
  const mode = body.mode as UniverseGenerationMode | undefined;
  const geoLevel = body.geoLevel ? String(body.geoLevel) : undefined;
  const validGeoLevels = ["province", "district", "neighborhood", "village", "street"];
  return {
    ...base,
    projectId: String(body.projectId || base.projectId || ""),
    includeGeo: body.includeGeo !== false,
    mode: mode && ["full", "geo_only", "faq_only", "selected"].includes(mode) ? mode : "full",
    dryRun: body.dryRun === true,
    geoLevel:
      geoLevel && validGeoLevels.includes(geoLevel)
        ? (geoLevel as UniverseGeneratorFilters["geoLevel"])
        : "province",
    geoLimit: body.geoLimit != null ? Number(body.geoLimit) : undefined,
    provinceIds: Array.isArray(body.provinceIds) ? body.provinceIds.map(String) : undefined,
    districtIds: Array.isArray(body.districtIds) ? body.districtIds.map(String) : undefined,
    neighborhoodIds: Array.isArray(body.neighborhoodIds) ? body.neighborhoodIds.map(String) : undefined,
    villageIds: Array.isArray(body.villageIds) ? body.villageIds.map(String) : undefined,
    autoRunPipeline: body.autoRunPipeline === true,
    autoPublishInternal: body.autoPublishInternal === true,
    pipelineLimit: body.pipelineLimit != null ? Number(body.pipelineLimit) : undefined,
    minPublishScore: body.minPublishScore != null ? Number(body.minPublishScore) : undefined,
    blueprintTypes: Array.isArray(body.blueprintTypes)
      ? body.blueprintTypes.map(String)
      : undefined,
    stopOnError: body.stopOnError === true,
  };
}

export function parseUniversePipelineBody(body: Record<string, unknown>) {
  return {
    autoPublishInternal: body.autoPublishInternal === true,
    pipelineLimit: body.pipelineLimit != null ? Number(body.pipelineLimit) : 100,
    minPublishScore: body.minPublishScore != null ? Number(body.minPublishScore) : 70,
    blueprintTypes: Array.isArray(body.blueprintTypes)
      ? body.blueprintTypes.map(String)
      : undefined,
    stopOnError: body.stopOnError === true,
    dryRun: body.dryRun === true,
  };
}
