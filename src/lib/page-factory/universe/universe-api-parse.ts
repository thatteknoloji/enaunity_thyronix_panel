import type { UniverseGenerationMode, UniverseGeneratorFilters, UniverseSourceType } from "@/lib/page-factory/universe/universe-types";

export function parseUniverseFilters(body: Record<string, unknown>): UniverseGeneratorFilters {
  const mode = body.mode as UniverseGenerationMode | undefined;
  return {
    projectId: String(body.projectId || ""),
    sourceType: (body.sourceType ? String(body.sourceType) : "ALL") as UniverseSourceType,
    productIds: Array.isArray(body.productIds) ? body.productIds.map(String) : undefined,
    minQualityScore: body.minQualityScore != null ? Number(body.minQualityScore) : 0,
    limit: body.limit != null ? Number(body.limit) : undefined,
    includeGeo: body.includeGeo !== false,
    mode: mode && ["full", "geo_only", "faq_only", "selected"].includes(mode) ? mode : "full",
    dryRun: body.dryRun === true,
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
