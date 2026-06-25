/** Analiz Merkezi ortak ürün sözleşmesi — THYRONIX + ENA */
export type AnalysisProductSource = "thyronix" | "dealer_product" | "store_catalog" | "package_catalog";

export type AnalysisFeedQuality = {
  hasCategory: boolean;
  hasBarcode: boolean;
  hasStockCode: boolean;
  hasModelCode: boolean;
  hasVat: boolean;
  hasCostPrice: boolean;
  hasDescription: boolean;
  imageCount: number;
  variantCount: number;
  missingFields: string[];
};

export type AnalysisProductRecord = {
  id: string;
  source: AnalysisProductSource;
  sourceLabel: string;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  stockCode: string | null;
  modelCode: string | null;
  price: number;
  costPrice: number | null;
  stock: number;
  image: string | null;
  images: string | null;
  imageCount: number;
  vatRate: number | null;
  shippingCost: number | null;
  deliveryTime: string | null;
  feedQuality: AnalysisFeedQuality;
  updatedAt: string;
};

export type AnalysisSourceCounts = {
  thyronix?: number;
  dealerProduct: number;
  storeCatalog: number;
  packageCatalog: number;
  total: number;
};

export function parseImagesJson(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  } catch {
    /* ignore */
  }
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildFeedQuality(input: {
  category?: string | null;
  barcode?: string | null;
  stockCode?: string | null;
  modelCode?: string | null;
  vatRate?: number | null;
  costPrice?: number | null;
  description?: string | null;
  imageCount?: number;
  variantCount?: number;
}): AnalysisFeedQuality {
  const missingFields: string[] = [];
  if (!input.category?.trim()) missingFields.push("kategori");
  if (!input.barcode?.trim()) missingFields.push("barkod");
  if (!input.stockCode?.trim()) missingFields.push("stok kodu");
  if (!input.modelCode?.trim()) missingFields.push("model kodu");
  if (input.vatRate == null) missingFields.push("KDV");
  if (input.costPrice == null) missingFields.push("maliyet");
  if (!input.description?.trim()) missingFields.push("açıklama");
  if ((input.imageCount ?? 0) < 2) missingFields.push("görsel");
  if ((input.variantCount ?? 0) < 1) missingFields.push("varyant");

  return {
    hasCategory: Boolean(input.category?.trim()),
    hasBarcode: Boolean(input.barcode?.trim()),
    hasStockCode: Boolean(input.stockCode?.trim()),
    hasModelCode: Boolean(input.modelCode?.trim()),
    hasVat: input.vatRate != null,
    hasCostPrice: input.costPrice != null,
    hasDescription: Boolean(input.description?.trim()),
    imageCount: input.imageCount ?? 0,
    variantCount: input.variantCount ?? 0,
    missingFields,
  };
}
