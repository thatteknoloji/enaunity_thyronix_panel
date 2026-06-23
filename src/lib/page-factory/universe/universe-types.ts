export const UNIVERSE_BRIDGE_GENERATION_SOURCE = "PRODUCT_UNIVERSE_BRIDGE_V2" as const;
export const UNIVERSE_GENERATION_SOURCE = UNIVERSE_BRIDGE_GENERATION_SOURCE;
export const UNIVERSE_LEGACY_GENERATION_SOURCE = "PAGE_FACTORY_UNIVERSE_GENERATOR_V1" as const;
export const UNIVERSE_PRE_BRIDGE_SOURCE = "UNIVERSE_GENERATOR_V1" as const;
export const UNIVERSE_VERSION = "PRODUCT_UNIVERSE_BRIDGE_V2" as const;

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
  | "TRENDYOL"
  | "XLSX"
  | "XML"
  | "CSV";

export const UNIVERSE_SOURCE_OPTIONS: Array<{ value: UniverseSourceType; label: string }> = [
  { value: "ALL", label: "Tüm Kaynaklar" },
  { value: "PRODUCT_UNIVERSE", label: "Product Universe" },
  { value: "XLSX", label: "XLSX" },
  { value: "CSV", label: "CSV" },
  { value: "TRENDYOL", label: "Trendyol" },
  { value: "XML", label: "XML" },
];

export type UniverseGenerationMode =
  | "full"
  | "geo_only"
  | "faq_only"
  | "selected";

export type UniverseAutoPipelineOptions = {
  autoRunPipeline?: boolean;
  autoPublishInternal?: boolean;
  pipelineLimit?: number;
  minPublishScore?: number;
  blueprintTypes?: string[];
  stopOnError?: boolean;
  dryRun?: boolean;
};

import type { UniverseGeoLevel } from "@/lib/page-factory/types";

export type UniverseProductSourceFilters = {
  projectId?: string;
  dealerId?: string | null;
  sourceType?: UniverseSourceType;
  minQualityScore?: number;
  category?: string;
  brand?: string;
  hasImage?: boolean;
  status?: string;
  limit?: number;
  productIds?: string[];
  includeGeo?: boolean;
  mode?: UniverseGenerationMode;
  geoLevel?: UniverseGeoLevel | "street";
  geoLimit?: number;
  provinceIds?: string[];
  districtIds?: string[];
  neighborhoodIds?: string[];
  villageIds?: string[];
};

export type UniverseGeneratorFilters = UniverseAutoPipelineOptions &
  UniverseProductSourceFilters & {
    projectId: string;
    includeGeo?: boolean;
    mode?: UniverseGenerationMode;
    dryRun?: boolean;
    /** DB GEO katmanı — varsayılan: tüm 81 il */
    geoLevel?: UniverseGeoLevel | "street";
    geoLimit?: number;
    provinceIds?: string[];
    districtIds?: string[];
    neighborhoodIds?: string[];
    villageIds?: string[];
  };

/** @deprecated TOP_20_CITIES — artık DB GEO kullanılıyor; geri uyumluluk için tutuldu */
export type UniverseCity = {
  slug: string;
  name: string;
  region: string;
};

export const UNIVERSE_GEO_LEVEL_OPTIONS: Array<{ value: UniverseGeoLevel | "street"; label: string }> = [
  { value: "province", label: "İl (81)" },
  { value: "district", label: "İlçe (973)" },
  { value: "neighborhood", label: "Mahalle" },
  { value: "village", label: "Köy" },
  { value: "street", label: "Cadde / Sokak" },
];

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
  | "product_category"
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
  | "PRODUCT_CATEGORY"
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
  categoryCount: number;
  variantsPerProduct: number;
  geoNodesPerProduct: number;
  geoCatalog?: {
    provinces: number;
    districts: number;
    neighborhoods: number;
    villages: number;
    streets: number;
  };
  byPageType: Record<string, number>;
  warnings: string[];
};

export type UniversePreviewResult = UniverseEstimateResult & {
  sampleBlueprints: UniverseBlueprintDraft[];
  sampleProducts: Array<{
    id: string;
    name: string;
    brand: string;
    category: string;
    sourceType: string;
    qualityScore: number;
    status: string;
    imageCount: number;
  }>;
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
  pipelineJobId?: string;
  pipelineResult?: {
    triggeredByUniverseJobId: string;
    processedBlueprints: number;
    aeoGenerated: number;
    draftsGenerated: number;
    gatesGenerated: number;
    pagesPublished: number;
    pagesUpdated: number;
    errorCount: number;
  };
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
