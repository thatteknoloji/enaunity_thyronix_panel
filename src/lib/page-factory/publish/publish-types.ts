import type { BlueprintKind } from "@/lib/aeo/aeo-types";

export const PUBLISH_ENGINE_VERSION = "PAGE_FACTORY_PUBLISH_ENGINE_V1" as const;

export const PUBLISH_LIMITS = {
  defaultLimit: 100,
  adminMax: 1000,
  dealerMax: 100,
} as const;

export type PublishBulkFilters = {
  projectId?: string;
  generationSource?: string;
  blueprintType?: string;
  minPublishScore?: number;
  limit?: number;
  stopOnError?: boolean;
};

export type PublishPreviewResult = {
  draftId: string;
  blueprintId: string;
  title: string;
  slug: string;
  path: string;
  robots: string;
  canonicalUrl: string | null;
  publishScore: number;
  seoScore: number;
  aeoScore: number;
  geoScore: number;
  blueprintKind: BlueprintKind;
  gateStatus: string;
  draftStatus: string;
  eligible: boolean;
  blockers: string[];
  warnings: string[];
};

export type PublishDraftResult = {
  pageId: string;
  draftId: string;
  path: string;
  slug: string;
  status: string;
  robots: string;
  created: boolean;
  updated: boolean;
};

export type BulkPublishResult = {
  processed: number;
  published: number;
  updated: number;
  skipped: number;
  errors: Array<{ draftId: string; message: string }>;
};

export type PublishedPageFilters = {
  projectId?: string;
  dealerId?: string | null;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type PublishedPageStats = {
  staged: number;
  publishedInternal: number;
  unpublished: number;
  archived: number;
  indexCount: number;
  noindexCount: number;
  avgSeoScore: number;
  avgAeoScore: number;
  avgGeoScore: number;
  avgPublishScore: number;
  total: number;
};

export function resolvePublishLimit(limit: number | undefined, isAdmin?: boolean): number {
  const max = isAdmin ? PUBLISH_LIMITS.adminMax : PUBLISH_LIMITS.dealerMax;
  return Math.min(Math.max(1, limit ?? PUBLISH_LIMITS.defaultLimit), max);
}
