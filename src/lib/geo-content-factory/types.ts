export type GeoGenerationMode = "PROVINCE" | "DISTRICT" | "PROVINCE_AND_DISTRICT";

export type GeoSlugMode = "PROVINCE" | "DISTRICT";

export type GeoContentTarget = {
  province: string;
  district: string | null;
  scope: GeoSlugMode;
  slug: string;
  titleHint: string;
};

export type GeoJobSettings = {
  mode: GeoGenerationMode;
  autoPublish?: boolean;
  projectId?: string | null;
  dealerId?: string | null;
  provinces?: string[];
  dryRun?: boolean;
};

export type GeoPreviewResult = {
  keyword: string;
  mode: GeoGenerationMode;
  totalTargets: number;
  provinceCount: number;
  districtCount: number;
  sampleUrls: string[];
  sampleSlugs: string[];
  estimatedSeconds: number;
  estimatedMinutes: number;
};

export type GeoJobStats = {
  totalGeoContent: number;
  totalProvinces: number;
  totalDistricts: number;
  successRate: number;
  recentJobs: Array<{
    id: string;
    keyword: string;
    status: string;
    totalTargets: number;
    generatedCount: number;
    publishedCount: number;
    failedCount: number;
    createdAt: string;
  }>;
  jobsByStatus: Record<string, number>;
};

export type GeoGenerationItemResult = {
  target: GeoContentTarget;
  created: boolean;
  updated: boolean;
  published: boolean;
  slug: string;
  postId?: string;
  error?: string;
};

export type GeoBatchResult = {
  jobId?: string;
  total: number;
  generated: number;
  published: number;
  failed: number;
  results: GeoGenerationItemResult[];
};

export type GeoGeoInternalLinksPayload = {
  relatedGeoBlogs: Array<{ title: string; href: string; reason: string }>;
  relatedCategoryBlogs: Array<{ title: string; href: string; reason: string }>;
  relatedProducts: Array<{ title: string; href: string; reason: string }>;
  relatedPages: Array<{ title: string; href: string; reason: string }>;
};
