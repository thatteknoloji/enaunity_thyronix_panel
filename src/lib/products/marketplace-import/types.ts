export type ImportPresetId = "trendyol_tablo" | "hepsiburada" | "generic";

export interface FieldMapping {
  name?: string;
  description?: string;
  brand?: string;
  category?: string;
  modelCode?: string;
  sku?: string;
  barcode?: string;
  price?: string;
  stock?: string;
  image?: string;
  images?: string[];
  /** Variant axis columns → group name */
  variantAxes?: Record<string, string>;
}

export interface ParsedImportRow {
  rowIndex: number;
  name: string;
  description: string;
  brand: string;
  category: string;
  modelCode: string;
  sku: string;
  barcode: string;
  price: number;
  stock: number;
  image: string;
  images: string[];
  variantOptions: { group: string; value: string }[];
  raw: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

export interface GroupedProduct {
  modelCode: string;
  /** Parent title: most frequent name in group */
  name: string;
  /** Parent description: longest non-empty description in group */
  description: string;
  brand: string;
  category: string;
  image: string;
  images: string[];
  /** Base price = min variant price */
  price: number;
  /** Total stock across variants */
  stock: number;
  rows: ParsedImportRow[];
  errors: string[];
  warnings: string[];
}

export interface ImportPreviewResult {
  preset: ImportPresetId;
  fileName: string;
  totalRows: number;
  groups: GroupedProduct[];
  ungroupedRows: ParsedImportRow[];
  categoryValues: string[];
  errors: string[];
}

export interface CategoryMapping {
  [sourceCategory: string]: string;
}

export interface ImportCommitResult {
  jobId: string;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  productIds: string[];
}
