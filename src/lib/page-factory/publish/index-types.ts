export const PAGE_INDEX_VERSION = "PAGE_FACTORY_PUBLISHED_INDEX_V1" as const;

export type PublishedPageIndexFilters = {
  projectId?: string;
  dealerId?: string | null;
  status?: string;
  robots?: "index" | "noindex" | "all";
  blueprintType?: string;
  generationSource?: string;
  minSeoScore?: number;
  minAeoScore?: number;
  minGeoScore?: number;
  minPublishScore?: number;
  query?: string;
  page?: number;
  pageSize?: number;
};

export type PublishedPageIndexItem = {
  id: string;
  draftId: string;
  blueprintId: string;
  projectId: string | null;
  dealerId: string | null;
  title: string;
  slug: string;
  path: string;
  status: string;
  robots: string;
  publishScore: number;
  seoScore: number;
  aeoScore: number;
  geoScore: number;
  blueprintType: string;
  generationSource: string;
  indexable: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export type PublishedPageIndexStats = {
  total: number;
  staged: number;
  publishedInternal: number;
  unpublished: number;
  archived: number;
  indexable: number;
  noindex: number;
  avgSeoScore: number;
  avgAeoScore: number;
  avgGeoScore: number;
  avgPublishScore: number;
};

export type PublishedPageIndexResult = {
  items: PublishedPageIndexItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PublishedPageValidationIssue = {
  pageId: string;
  path: string;
  issue: string;
  severity: "error" | "warning";
};

export type PublishedPageValidationResult = {
  checked: number;
  errors: number;
  warnings: number;
  issues: PublishedPageValidationIssue[];
};

export const INDEX_LIMITS = {
  defaultPageSize: 20,
  maxPageSize: 100,
  adminMaxPageSize: 200,
} as const;

export function resolvePageSize(pageSize: number | undefined, isAdmin?: boolean): number {
  const max = isAdmin ? INDEX_LIMITS.adminMaxPageSize : INDEX_LIMITS.maxPageSize;
  return Math.min(Math.max(1, pageSize ?? INDEX_LIMITS.defaultPageSize), max);
}
