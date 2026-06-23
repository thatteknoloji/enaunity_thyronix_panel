export const PIPELINE_VERSION = "AEO_BULK_DRAFT_PIPELINE_V1" as const;

export type PipelineMode = "full" | "aeo_only" | "draft_only" | "gate_only";

export type PipelineFilters = {
  projectId?: string;
  generationSource?: string;
  blueprintType?: string;
  minQualityScore?: number;
  minAeoScore?: number;
  onlyWithoutAeo?: boolean;
  onlyWithoutDraft?: boolean;
  onlyWithoutGate?: boolean;
  limit?: number;
  dryRun?: boolean;
  stopOnError?: boolean;
  mode?: PipelineMode;
};

export type PipelinePreviewResult = {
  totalBlueprints: number;
  needsAeo: number;
  needsDraft: number;
  needsGate: number;
  readyToPublishEstimate: number;
  gatePassedEstimate: number;
  gateWarningEstimate: number;
  gateBlockedEstimate: number;
  sampleBlueprintIds: string[];
  warnings: string[];
  planOnly?: boolean;
};

export type PipelineRunResult = {
  jobId: string;
  totalBlueprints: number;
  aeoGenerated: number;
  draftsGenerated: number;
  gatePassed: number;
  gateWarning: number;
  gateBlocked: number;
  errorCount: number;
  dryRun: boolean;
  warnings: string[];
  errors: Array<{ blueprintId: string; message: string }>;
};

export const PIPELINE_LIMITS = {
  defaultLimit: 100,
  adminMax: 1000,
  dealerMax: 100,
  planOnlyThreshold: 10_000,
} as const;

export function resolvePipelineLimit(limit: number | undefined, isAdmin?: boolean): number {
  const max = isAdmin ? PIPELINE_LIMITS.adminMax : PIPELINE_LIMITS.dealerMax;
  return Math.min(Math.max(1, limit ?? PIPELINE_LIMITS.defaultLimit), max);
}
