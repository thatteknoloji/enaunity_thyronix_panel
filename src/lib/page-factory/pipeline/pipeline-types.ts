export const PIPELINE_VERSION = "PAGE_FACTORY_FULL_CHAIN_ACTIVATION_V1" as const;

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
  autoPublish?: boolean;
};

export type PipelinePreviewResult = {
  totalBlueprints: number;
  totalCandidates: number;
  needsAeo: number;
  needsDraft: number;
  needsGate: number;
  readyToPublishEstimate: number;
  gatePassedEstimate: number;
  gateWarningEstimate: number;
  gateBlockedEstimate: number;
  publishEstimate?: number;
  sampleBlueprintIds: string[];
  warnings: string[];
  planOnly?: boolean;
  generationSource: string;
};

export type PipelineRunResult = {
  jobId: string;
  totalBlueprints: number;
  processed: number;
  skipped: number;
  aeoGenerated: number;
  draftsGenerated: number;
  gatePassed: number;
  gateWarning: number;
  gateBlocked: number;
  pagesPublished: number;
  pagesUpdated: number;
  publishSkipped: number;
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
