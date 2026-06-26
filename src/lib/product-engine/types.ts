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
