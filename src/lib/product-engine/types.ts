/** Product Graph V1 — canonical product profile (Single Source of Truth) */

export type ProductGraphIdentity = {
  productCode: string;
  productType: string;
  displayName: string;
  slug: string;
  category: string;
  subcategory: string;
  isActive: boolean;
  isPOD: boolean;
  isDropship: boolean;
  isMarketplace: boolean;
  isProduction: boolean;
};

export type ProductGraphPricing = {
  pricingCatalogId: string;
  pricingRuleCode: string;
  defaultVat: number;
  defaultCurrency: string;
  defaultCustomerType: string;
};

export type ProductGraphPod = {
  mockupTemplate: string;
  printArea: string;
  printAreaRect: { x: number; y: number; width: number; height: number } | null;
  bleed: string;
  safeArea: string;
  exportMode: string;
  dpi: number;
};

export type ProductGraphProduction = {
  productionProfile: string;
  machineType: string;
  packagingProfile: string;
  defaultPriority: string;
};

export type ProductGraphMarketplace = {
  marketplacePreset: string;
  defaultCategory: string;
  commissionProfile: string;
  shippingProfile: string;
};

export type ProductGraphSeo = {
  entity: string;
  topic: string;
  keywords: string[];
  schemaType: string;
};

export type ProductGraphAsset = {
  assetProfile: string;
  originalImageType: string;
  mockupProfile: string;
  excelProfile: string;
};

export type ProductGraphAnalysis = {
  analysisProfile: string;
  costProfile: string;
  profitProfile: string;
};

export type ProductGraphProfile = {
  identity: ProductGraphIdentity;
  pricing: ProductGraphPricing;
  pod: ProductGraphPod;
  production: ProductGraphProduction;
  marketplace: ProductGraphMarketplace;
  seo: ProductGraphSeo;
  asset: ProductGraphAsset;
  analysis: ProductGraphAnalysis;
};

export type ProductGraphLookup = {
  productCode?: string;
  templateId?: string;
  category?: string;
  slug?: string;
};

export type ProductGraphOverrides = Partial<{
  identity: Partial<ProductGraphIdentity>;
  pricing: Partial<ProductGraphPricing>;
  pod: Partial<ProductGraphPod>;
  production: Partial<ProductGraphProduction>;
  marketplace: Partial<ProductGraphMarketplace>;
  seo: Partial<ProductGraphSeo>;
  asset: Partial<ProductGraphAsset>;
  analysis: Partial<ProductGraphAnalysis>;
}>;

// --- Legacy Product Engine DTO (admin UI + API) ---

export type ProductEngineFlags = {
  active: boolean;
  pod: boolean;
  dropship: boolean;
  production: boolean;
};

export type ProductEngineIdentity = {
  name: string;
  productType: string;
  category: string;
  subCategory: string;
  brand: string;
  sku: string;
  barcode: string;
};

export type ProductEngineProduction = {
  printArea: string;
  safeArea: string;
  bleed: string;
  exportMode: string;
  dpi: number;
  shape: string;
  mockupType: string;
  productionProfile: string;
  productionNotes: string;
  packagingType: string;
  machineNotes: string;
};

export type ProductEnginePricing = {
  pricingCatalog: string;
  pricingRule: string;
  marketplaceRule: string;
  dealerRule: string;
  retailRule: string;
};

export type ProductEngineMockup = {
  front: string;
  back: string;
  detail: string;
  lifestyle: string;
  templates: string[];
};

export type ProductEngineMedia = {
  cover: string;
  gallery: string[];
  thumbnail: string;
  seoImage: string;
};

export type ProductEngineSeo = {
  title: string;
  description: string;
  slug: string;
  tags: string[];
  keywords: string[];
};

export type ProductEngineMarketplaceChannel = {
  enabled: boolean;
  categoryId: string;
  categoryLabel: string;
  commissionPercent: number;
  cargoProfile: string;
};

export type ProductEngineMarketplace = {
  trendyol: ProductEngineMarketplaceChannel;
  hepsiburada: ProductEngineMarketplaceChannel;
  n11: ProductEngineMarketplaceChannel;
  ciceksepeti: ProductEngineMarketplaceChannel;
};

export type ProductEnginePod = {
  templateId: string;
  templateType: string;
  variantId: string;
  printAreaMode: string;
  editorPlugin: string;
  overlayVisible: boolean;
  exportCrop: string;
  productionPackEnabled: boolean;
};

export type ProductEngineDto = {
  id: string;
  source: "pod_profile" | "b2b" | "catalog" | "custom";
  graph: ProductGraphProfile;
  identity: ProductEngineIdentity;
  production: ProductEngineProduction;
  pricing: ProductEnginePricing;
  mockup: ProductEngineMockup;
  media: ProductEngineMedia;
  seo: ProductEngineSeo;
  marketplace: ProductEngineMarketplace;
  pod: ProductEnginePod;
  flags: ProductEngineFlags;
  updatedAt: string;
};

export type ProductEngineOverrides = Partial<{
  graph: ProductGraphOverrides;
  identity: Partial<ProductEngineIdentity>;
  production: Partial<ProductEngineProduction>;
  pricing: Partial<ProductEnginePricing>;
  mockup: Partial<ProductEngineMockup>;
  media: Partial<ProductEngineMedia>;
  seo: Partial<ProductEngineSeo>;
  marketplace: Partial<ProductEngineMarketplace>;
  pod: Partial<ProductEnginePod>;
  flags: Partial<ProductEngineFlags>;
}>;

export type ProductEngineFilters = {
  category?: string;
  productType?: string;
  active?: string;
  pod?: string;
  dropship?: string;
  production?: string;
  search?: string;
};

export type CreateProductEngineInput = {
  id?: string;
  identity: Partial<ProductEngineIdentity>;
  flags?: Partial<ProductEngineFlags>;
  overrides?: ProductEngineOverrides;
};
