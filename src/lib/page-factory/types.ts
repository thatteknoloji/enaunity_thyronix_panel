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
