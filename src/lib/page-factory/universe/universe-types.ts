export const UNIVERSE_GENERATION_SOURCE = "PAGE_FACTORY_UNIVERSE_GENERATOR_V1" as const;
export const UNIVERSE_VERSION = "PAGE_FACTORY_UNIVERSE_GENERATOR_V1" as const;

export const UNIVERSE_LIMITS = {
  defaultBatch: 100,
  adminMax: 1000,
  chunkSize: 25,
  maxSlugLength: 80,
  minBlueprintsPerProduct: 11,
  previewSampleSize: 20,
} as const;

export type UniverseSourceType =
  | "ALL"
  | "PRODUCT_UNIVERSE"
  | "PRODUCT_LIBRARY"
  | "THYRONIX"
  | "XLSX"
  | "XML"
  | "CSV";

export const UNIVERSE_SOURCE_OPTIONS: Array<{ value: UniverseSourceType; label: string }> = [
  { value: "ALL", label: "Tüm Kaynaklar" },
  { value: "PRODUCT_UNIVERSE", label: "Product Universe" },
  { value: "PRODUCT_LIBRARY", label: "Product Library" },
  { value: "THYRONIX", label: "Thyronix Product" },
  { value: "XLSX", label: "Excel Import" },
  { value: "XML", label: "XML Import" },
  { value: "CSV", label: "CSV Import" },
];

export type UniverseGenerationMode =
  | "full"
  | "geo_only"
  | "faq_only"
  | "selected";

export type UniverseGeneratorFilters = {
  projectId: string;
  sourceType?: UniverseSourceType;
  productIds?: string[];
  minQualityScore?: number;
  limit?: number;
  includeGeo?: boolean;
  mode?: UniverseGenerationMode;
  dryRun?: boolean;
};

export type UniverseCity = {
  slug: string;
  name: string;
  region: string;
};

export const TOP_20_CITIES: UniverseCity[] = [
  { slug: "istanbul", name: "İstanbul", region: "Marmara" },
  { slug: "ankara", name: "Ankara", region: "İç Anadolu" },
  { slug: "izmir", name: "İzmir", region: "Ege" },
  { slug: "bursa", name: "Bursa", region: "Marmara" },
  { slug: "antalya", name: "Antalya", region: "Akdeniz" },
  { slug: "konya", name: "Konya", region: "İç Anadolu" },
  { slug: "adana", name: "Adana", region: "Akdeniz" },
  { slug: "mersin", name: "Mersin", region: "Akdeniz" },
  { slug: "samsun", name: "Samsun", region: "Karadeniz" },
  { slug: "kayseri", name: "Kayseri", region: "İç Anadolu" },
  { slug: "gaziantep", name: "Gaziantep", region: "Güneydoğu" },
  { slug: "eskisehir", name: "Eskişehir", region: "İç Anadolu" },
  { slug: "kocaeli", name: "Kocaeli", region: "Marmara" },
  { slug: "sakarya", name: "Sakarya", region: "Marmara" },
  { slug: "denizli", name: "Denizli", region: "Ege" },
  { slug: "mugla", name: "Muğla", region: "Ege" },
  { slug: "aydin", name: "Aydın", region: "Ege" },
  { slug: "balikesir", name: "Balıkesir", region: "Marmara" },
  { slug: "tekirdag", name: "Tekirdağ", region: "Marmara" },
  { slug: "trabzon", name: "Trabzon", region: "Karadeniz" },
];

export type UniversePageType =
  | "product_detail"
  | "product_faq"
  | "product_intent"
  | "product_guide"
  | "product_benefit"
  | "product_problem"
  | "product_comparison"
  | "product_alternative"
  | "product_geo";

export type UniverseBlueprintKind =
  | "PRODUCT_DETAIL"
  | "PRODUCT_FAQ"
  | "PRODUCT_INTENT"
  | "PRODUCT_GUIDE"
  | "PRODUCT_BENEFIT"
  | "PRODUCT_PROBLEM"
  | "PRODUCT_COMPARISON"
  | "PRODUCT_ALTERNATIVE"
  | "PRODUCT_GEO";

export type UniverseBlueprintDraft = {
  productId: string;
  productName: string;
  pageType: UniversePageType;
  blueprintKind: UniverseBlueprintKind;
  variantKey: string;
  title: string;
  slug: string;
  targetQuery: string;
  intent: string;
  geoTarget: string | null;
  priorityScore: number;
  qualityScore: number;
  metadata: Record<string, unknown>;
};

export type UniverseEstimateResult = {
  totalProducts: number;
  estimatedBlueprints: number;
  perProductMin: number;
  geoCount: number;
  intentCount: number;
  faqCount: number;
  byPageType: Record<string, number>;
  warnings: string[];
};

export type UniversePreviewResult = UniverseEstimateResult & {
  sampleBlueprints: UniverseBlueprintDraft[];
  duplicateCount: number;
};

export type UniverseGenerateResult = {
  jobId: string;
  totalProducts: number;
  totalBlueprints: number;
  generatedBlueprints: number;
  updatedBlueprints: number;
  skippedCount: number;
  duplicateCount: number;
  errorCount: number;
  geoCount: number;
  intentCount: number;
  faqCount: number;
  warnings: string[];
  errors: Array<{ productId: string; message: string }>;
  dryRun: boolean;
};

export type UniverseJobStats = {
  id: string;
  projectId: string | null;
  sourceType: string;
  status: string;
  totalProducts: number;
  totalBlueprints: number;
  generatedBlueprints: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export function resolveUniverseLimit(limit: number | undefined, isAdmin?: boolean): number {
  const max = isAdmin ? UNIVERSE_LIMITS.adminMax : UNIVERSE_LIMITS.defaultBatch;
  const requested = limit ?? UNIVERSE_LIMITS.defaultBatch;
  return Math.min(Math.max(1, requested), max);
}
