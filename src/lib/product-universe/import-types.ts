import type { ProductColumnMapping } from "./column-detector";

export const IMPORT_SOURCE_TYPES_V2 = [
  "TRENDYOL_EXCEL",
  "SUPPLIER_EXCEL",
  "CSV",
  "JSON",
  "XLSX",
  "MANUAL",
] as const;

export type ImportSourceTypeV2 = (typeof IMPORT_SOURCE_TYPES_V2)[number];

export type DuplicateMode = "skip" | "update" | "create_new";

export const ROW_LIMITS = {
  adminMax: 50_000,
  dealerMax: 10_000,
  defaultCommit: 1_000,
  previewSample: 20,
} as const;

export const MAPPING_FIELD_DEFS = [
  { key: "name", label: "Ürün Adı", required: false, group: "temel" },
  { key: "stockCode", label: "SKU / Stok Kodu", required: false, group: "temel" },
  { key: "barcode", label: "Barkod", required: false, group: "temel" },
  { key: "description", label: "Açıklama", required: false, group: "temel" },
  { key: "brand", label: "Marka", required: false, group: "temel" },
  { key: "categoryPath", label: "Kategori", required: false, group: "temel" },
  { key: "price", label: "Fiyat", required: false, group: "fiyat" },
  { key: "stock", label: "Stok", required: false, group: "fiyat" },
  { key: "currency", label: "Para Birimi", required: false, group: "fiyat" },
  { key: "productUrl", label: "Ürün URL", required: false, group: "link" },
  { key: "image", label: "Görsel (tek kolon)", required: false, group: "görsel" },
  { key: "_skip", label: "Bu kolonu yok say", required: false, group: "meta" },
] as const;

export type MappingFieldKey = (typeof MAPPING_FIELD_DEFS)[number]["key"];

/** Excel column name → field key (or _skip) */
export type UserColumnMapping = Record<string, MappingFieldKey | string>;

export const EXCEL_AUTOMATION_VERSION = "PRODUCT_UNIVERSE_EXCEL_AUTOMATION_V1" as const;

export type ImportAutomationOptions = {
  autoGenerateUniverse?: boolean;
  autoRunPipeline?: boolean;
  autoPublishInternal?: boolean;
  pipelineLimit?: number;
  minPublishScore?: number;
  includeGeo?: boolean;
  stopOnError?: boolean;
};

export type ImportCommitOptions = ImportAutomationOptions & {
  dealerId?: string | null;
  isAdmin?: boolean;
  projectId?: string | null;
  sourceType: ImportSourceTypeV2 | string;
  fileName: string;
  mapping?: UserColumnMapping;
  duplicateMode?: DuplicateMode;
  runAnalysis?: boolean;
  generateBlueprintPreview?: boolean;
  downloadImages?: boolean;
  limit?: number;
  minQuality?: number;
  dryRun?: boolean;
};

export type ImportAutomationResult = {
  universeJobId?: string;
  generatedBlueprints?: number;
  pipelineJobId?: string;
  pipelineResult?: {
    processedBlueprints: number;
    aeoGenerated: number;
    draftsGenerated: number;
    gatesGenerated: number;
    pagesPublished: number;
    pagesUpdated: number;
    errorCount: number;
  };
  warnings: string[];
};

export type PreviewRowSample = {
  rowIndex: number;
  rawName: string;
  normalizedName: string;
  brand: string;
  barcode: string;
  stockCode: string;
  categoryPath: string;
  descriptionRaw: string;
  descriptionClean: string;
  descriptionWarnings: string[];
  price: number | null;
  currency: string;
  stock: number | null;
  productUrl: string;
  imageUrls: string[];
  imageCount: number;
  qualityScore: number;
  status: string;
  duplicateKey: string;
  isDuplicateInFile: boolean;
  isDuplicateInDb: boolean;
  rowWarnings: string[];
};

export type ImportPreviewResult = {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningCount: number;
  duplicateInFile: number;
  duplicateInDb: number;
  imageUrlCount: number;
  productsWithImages: number;
  productsWithDescription: number;
  averageQualityScore: number;
  blueprintReadyEstimate: number;
  analyzedEstimate: number;
  rejectedEstimate: number;
  columns: string[];
  columnSamples: Record<string, string[]>;
  mapping: ProductColumnMapping;
  columnMapping: UserColumnMapping;
  detectedColumns: Record<string, string | string[]>;
  previewRows: PreviewRowSample[];
  warnings: string[];
  errors: Array<{ row: number; message: string }>;
};

export function userMappingToProductMapping(
  userMapping: UserColumnMapping
): Partial<ProductColumnMapping> {
  const result: Partial<ProductColumnMapping> = { imageColumns: [] };
  for (const [col, field] of Object.entries(userMapping)) {
    if (!field || field === "_skip") continue;
    if (field === "image") {
      result.imageColumns = [...(result.imageColumns || []), col];
    } else if (field in result && field !== "imageColumns") {
      // keep first mapping for scalar fields
      const k = field as keyof Omit<ProductColumnMapping, "imageColumns">;
      if (!result[k]) result[k] = col;
    } else {
      const k = field as keyof Omit<ProductColumnMapping, "imageColumns">;
      result[k] = col;
    }
  }
  return result;
}

export function productMappingToUserMapping(
  columns: string[],
  mapping: ProductColumnMapping
): UserColumnMapping {
  const out: UserColumnMapping = {};
  for (const col of columns) out[col] = "_skip";

  const scalarFields: Array<keyof Omit<ProductColumnMapping, "imageColumns">> = [
    "name",
    "description",
    "brand",
    "barcode",
    "stockCode",
    "categoryPath",
    "price",
    "stock",
    "currency",
    "productUrl",
  ];

  for (const field of scalarFields) {
    const col = mapping[field];
    if (col) out[col] = field;
  }
  for (const col of mapping.imageColumns) {
    out[col] = "image";
  }
  return out;
}

export function toPrismaSourceType(type: string) {
  const map: Record<string, string> = {
    TRENDYOL_EXCEL: "TRENDYOL",
    SUPPLIER_EXCEL: "MANUAL",
    CSV: "CSV",
    JSON: "MANUAL",
    XLSX: "XLSX",
    MANUAL: "MANUAL",
    TRENDYOL: "TRENDYOL",
  };
  return map[type.toUpperCase()] || "CSV";
}
