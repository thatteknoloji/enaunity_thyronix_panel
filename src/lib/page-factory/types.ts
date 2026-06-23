export const PAGE_FACTORY_MODULE_KEY = "AI_PAGE_FACTORY";

export const PRODUCTION_TYPES = [
  "GEO",
  "SEO",
  "GEO_SEO",
  "FAQ",
  "BLOG",
  "PRODUCT",
  "SERVICE",
  "MIXED",
] as const;

export type ProductionType = (typeof PRODUCTION_TYPES)[number];

export const TOPOLOGY_TYPES = ["geo", "location", "product", "question", "intent"] as const;
export type TopologyType = (typeof TOPOLOGY_TYPES)[number];

export const GEO_LAYERS = ["il", "ilce", "mahalle", "koy", "semt"] as const;
export type GeoLayer = (typeof GEO_LAYERS)[number];

export const BLUEPRINT_SECTIONS = [
  "Hero",
  "Giriş",
  "Ana İçerik",
  "SSS",
  "FAQ Schema",
  "Internal Links",
  "CTA",
] as const;

export type GeoNode = {
  id: string;
  layer: GeoLayer;
  name: string;
  parentId?: string;
  childCount?: number;
};

export type TopologyNode = {
  id: string;
  label: string;
  parentId?: string;
  depth: number;
  meta?: Record<string, string | number | boolean>;
};

export type ClusterChain = {
  id: string;
  path: string[];
  fullLabel: string;
  hierarchyLevel: number;
};

export type PageEstimate = {
  totalPages: number;
  breakdown: Record<string, number>;
  formula: string;
  note: string;
};

export type ProjectMetadata = {
  estimatedPageCount?: number;
  estimate?: PageEstimate;
  clusters?: ClusterChain[];
  clusterCount?: number;
  sampleClusterPaths?: string[];
  geoLayers?: string[];
  generatedAt?: string;
};

export type CreateProjectInput = {
  name: string;
  sector: string;
  country: string;
  language: string;
  productionType: ProductionType;
  dealerId?: string | null;
};

export type UniverseGeoLevel = "province" | "district" | "neighborhood" | "village" | "street";

export type UniverseConfig = {
  selectedIndustryId?: string;
  selectedCategoryIds: string[];
  selectedIntentIds: string[];
  selectedGeoLevels: UniverseGeoLevel[];
  selectedProvinceIds: string[];
  selectedDistrictIds: string[];
  selectedNeighborhoodIds: string[];
  selectedVillageIds: string[];
  includeFaq: boolean;
  includeLocalModifiers: boolean;
  generationLimit: number;
  batchSize: number;
  maxPreview: number;
  maxGenerate: number;
};

export const DEFAULT_UNIVERSE_CONFIG: UniverseConfig = {
  selectedCategoryIds: [],
  selectedIntentIds: [],
  selectedGeoLevels: ["province", "district"],
  selectedProvinceIds: [],
  selectedDistrictIds: [],
  selectedNeighborhoodIds: [],
  selectedVillageIds: [],
  includeFaq: false,
  includeLocalModifiers: false,
  generationLimit: 10000,
  batchSize: 500,
  maxPreview: 50,
  maxGenerate: 5000,
};

export type UniverseProjectMetadata = ProjectMetadata & {
  universe?: UniverseConfig;
  universeEstimate?: UniverseEstimateResult;
  lastUniverseGenerate?: { at: string; count: number };
};

export type RiskLevel = "safe" | "medium" | "high" | "critical" | "blocked";

export type UniverseEstimateResult = {
  estimatedTotal: number;
  riskLevel: RiskLevel;
  riskLabel: string;
  canGenerate: boolean;
  counts: {
    provinces: number;
    districts: number;
    neighborhoods: number;
    villages: number;
    categories: number;
    intents: number;
    faqPatterns: number;
    geoNodes: number;
    pageTypeVariants: number;
  };
  formula: string;
  warnings: string[];
  limits: { maxPreview: number; maxGenerate: number; generationLimit: number; batchSize: number };
  generationPlan: { batches: number; batchSize: number; cappedTotal: number };
};

export type BlueprintUniverseDraft = {
  title: string;
  slug: string;
  pageType: string;
  hierarchyLevel: number;
  geoPath: string;
  industryPath: string;
  intent: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  faqPatternIds: string[];
  internalLinkHints: string[];
  clusterPath: string;
  metadata: Record<string, unknown>;
};

export type UniverseEngineResult = {
  estimatedTotal: number;
  previewBlueprints: BlueprintUniverseDraft[];
  warnings: string[];
  limits: UniverseEstimateResult["limits"];
  generationPlan: UniverseEstimateResult["generationPlan"];
  estimate: UniverseEstimateResult;
};
