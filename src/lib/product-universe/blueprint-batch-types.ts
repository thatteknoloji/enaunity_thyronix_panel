export const BATCH_GENERATION_SOURCE = "PRODUCT_UNIVERSE_BATCH_V1" as const;

export const BLUEPRINT_TYPE_OPTIONS = [
  "product_detail",
  "product_category",
  "product_intent",
  "product_geo",
  "product_faq",
] as const;

export type BlueprintTypeSlug = (typeof BLUEPRINT_TYPE_OPTIONS)[number];

export type DuplicateMode = "skip" | "update";

export type BlueprintBatchFilters = {
  projectId?: string;
  sourceType?: string;
  sourceId?: string;
  category?: string;
  brand?: string;
  minQualityScore?: number;
  onlyWithImages?: boolean;
  onlyInStock?: boolean;
  blueprintTypes?: BlueprintTypeSlug[];
  includeGeo?: boolean;
  limit?: number;
  dryRun?: boolean;
  duplicateMode?: DuplicateMode;
};

export type SampleBlueprint = {
  productId: string;
  productName: string;
  blueprintType: string;
  title: string;
  slug: string;
  targetQuery: string;
  intent: string;
  geoTarget: string | null;
  priorityScore: number;
  qualityScore: number;
  metadata: Record<string, unknown>;
};

export type BlueprintBatchPreviewResult = {
  totalCandidates: number;
  eligibleProducts: number;
  skippedProducts: number;
  estimatedBlueprints: number;
  duplicateCount: number;
  byBlueprintType: Record<string, number>;
  sampleBlueprints: SampleBlueprint[];
  warnings: string[];
  planOnly?: boolean;
};

export type BlueprintBatchGenerateResult = {
  jobId: string;
  totalCandidates: number;
  eligibleProducts: number;
  generatedCount: number;
  skippedCount: number;
  duplicateCount: number;
  errorCount: number;
  warnings: string[];
  errors: Array<{ productId: string; message: string }>;
  dryRun: boolean;
};

export const BATCH_LIMITS = {
  defaultLimit: 100,
  adminMax: 5000,
  dealerMax: 500,
  chunkSize: 25,
  planOnlyThreshold: 10_000,
  previewSampleSize: 20,
  maxSlugLength: 80,
} as const;

export function resolveBatchLimit(limit: number | undefined, isAdmin?: boolean): number {
  const max = isAdmin ? BATCH_LIMITS.adminMax : BATCH_LIMITS.dealerMax;
  const requested = limit ?? BATCH_LIMITS.defaultLimit;
  return Math.min(Math.max(1, requested), max);
}

export function defaultBlueprintTypes(product: {
  categoryPath?: string;
  contentDNA?: { intent?: string | null } | null;
}): BlueprintTypeSlug[] {
  const types: BlueprintTypeSlug[] = ["product_detail", "product_faq"];
  if (product.categoryPath?.trim()) types.push("product_category");
  if (product.contentDNA?.intent?.trim()) types.push("product_intent");
  return types;
}
