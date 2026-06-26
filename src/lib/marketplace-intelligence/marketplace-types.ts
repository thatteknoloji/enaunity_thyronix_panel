export type MarketplaceId = "trendyol" | "hepsiburada" | "n11" | "ciceksepeti";

export type ShippingCarrierId =
  | "yurtici"
  | "aras"
  | "mng"
  | "surat"
  | "ptt"
  | "kolay_gelsin"
  | "dhl"
  | "ups";

export type DataConfidence = "official" | "manual" | "estimated";

export type SourceType = "pdf" | "html" | "manual" | "api";

export type EnaProductSlug =
  | "cam-tablo"
  | "cam-yuvarlak"
  | "mdf-tablo"
  | "hali"
  | "kilim"
  | "perde"
  | "kirlent"
  | "nevresim"
  | "poster"
  | "kupa"
  | "dekor"
  | "genel";

export type MarketplaceSourceMeta = {
  sourceName: string;
  sourceUrl?: string;
  sourceFile?: string;
  sourceType: SourceType;
  effectiveDate: string;
  vatIncluded: boolean;
  vatNote?: string;
  version: string;
  confidence: DataConfidence;
};

export type MarketplaceServiceFee = {
  id: string;
  label: string;
  ratePercent: number;
  vatIncluded: boolean;
  vatNote?: string;
};

export type CommissionRef = {
  mainCategory: string;
  subCategory: string;
  productGroupMatch?: string;
};

export type MarketplaceCategoryNode = {
  id: string;
  marketplace: MarketplaceId;
  name: string;
  path: string;
  enaSlug: EnaProductSlug;
  searchTerms: string[];
  parentPath?: string;
  commissionRef?: CommissionRef;
};

export type MarketplaceCommissionEntry = {
  marketplace: MarketplaceId;
  categoryId: string;
  mainCategory: string;
  subCategory: string;
  productGroup: string;
  ratePercent: number;
  vatIncluded: boolean;
  vatNote?: string;
  serviceFees: MarketplaceServiceFee[];
  source: MarketplaceSourceMeta;
};

export type ShippingBracket = {
  marketplace: MarketplaceId;
  carrier: ShippingCarrierId;
  desiMin: number;
  desiMax: number;
  price: number;
  currency: string;
  vatIncluded: boolean;
  vatNote?: string;
};

export type ShippingRateTable = {
  marketplace: MarketplaceId;
  carrier: ShippingCarrierId;
  carrierLabel: string;
  source: MarketplaceSourceMeta;
  desiPrices: number[];
  maxDesi: number;
  vatIncluded: boolean;
  vatNote?: string;
};

export type ProfitRiskLabel = "Zarar riski" | "Düşük marj" | "Orta risk" | "Sağlıklı";

export type ProfitCalculationInput = {
  marketplace: MarketplaceId | "";
  categoryId: string;
  salePrice: number;
  productCost: number;
  vatRatePercent: number;
  carrier: ShippingCarrierId | "";
  desi: number;
  packagingCost: number;
  adRatePercent: number;
  campaignDiscountPercent: number;
  extraFixedCost: number;
  targetMarginPercent?: number;
};

export type ProfitCalculationResult = {
  ready: boolean;
  errors: string[];
  warnings: string[];
  commissionRatePercent: number | null;
  commissionAmount: number;
  marketingServiceFee: number;
  marketplaceServiceFee: number;
  shippingAmount: number | null;
  vatAmount: number;
  adAmount: number;
  campaignDiscountAmount: number;
  packagingCost: number;
  productCost: number;
  extraFixedCost: number;
  totalExpense: number;
  netProfit: number;
  profitMarginPercent: number;
  breakEvenPrice: number | null;
  suggestedSalePrice: number | null;
  riskLabel: ProfitRiskLabel | null;
  categoryLabel: string | null;
  carrierLabel: string | null;
  commissionSource: MarketplaceSourceMeta | null;
  shippingSource: MarketplaceSourceMeta | null;
  dataConfidence: DataConfidence | null;
};

export type CategorySearchResult = {
  categoryId: string;
  marketplace: MarketplaceId;
  marketplaceLabel: string;
  name: string;
  path: string;
  enaSlug: EnaProductSlug;
  score: number;
  ratePercent?: number;
  confidence?: DataConfidence;
};
