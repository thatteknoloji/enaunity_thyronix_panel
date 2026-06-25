export const CATALOG_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;
export const SUPPLIER_TYPES = ["XML", "CSV", "EXCEL", "API"] as const;
export const LICENSE_LEVELS = ["FREE", "STARTER", "PRO", "ENTERPRISE"] as const;
export const IMPORT_TYPES = ["XML", "EXCEL", "CSV"] as const;
export const DISTRIBUTION_FORMATS = ["XML", "CSV", "EXCEL"] as const;
export const PACKAGE_FIELD_BEHAVIORS = ["LOCKED", "REPLACE", "PREFIX", "SUFFIX", "FIND_REPLACE", "NUMBER_FORMULA", "HIDDEN"] as const;
export const PACKAGE_COLUMN_TYPES = ["text", "number"] as const;
export const PACKAGE_FORMULA_TYPES = ["SET", "ADD", "MULTIPLY", "PERCENT"] as const;

export type CatalogStatus = (typeof CATALOG_STATUSES)[number];
export type SupplierType = (typeof SUPPLIER_TYPES)[number];
export type LicenseLevel = (typeof LICENSE_LEVELS)[number];
export type DistributionFormat = (typeof DISTRIBUTION_FORMATS)[number];
export type PackageFieldBehavior = (typeof PACKAGE_FIELD_BEHAVIORS)[number];
export type PackageColumnType = (typeof PACKAGE_COLUMN_TYPES)[number];
export type PackageFormulaType = (typeof PACKAGE_FORMULA_TYPES)[number];

export type ProductPackageColumn = {
  key: string;
  label: string;
  source: "CORE" | "ATTRIBUTE";
  dataType: PackageColumnType;
  sampleValues?: string[];
};

export type ProductPackageFieldRule = {
  key: string;
  label: string;
  exportKey: string;
  source: "CORE" | "ATTRIBUTE";
  dataType: PackageColumnType;
  behavior: PackageFieldBehavior;
  required?: boolean;
  visible?: boolean;
};

export type ProductPackageRecipeValue = {
  value?: string;
  prefix?: string;
  suffix?: string;
  findText?: string;
  replaceText?: string;
  formulaType?: PackageFormulaType;
  formulaValue?: number;
  minValue?: number;
  roundTo?: number;
};

export type CatalogItemInput = {
  barcode?: string;
  sku?: string;
  name: string;
  brand?: string;
  category?: string;
  price?: number;
  salePrice?: number;
  stock?: number;
  vatRate?: number;
  imagesJson?: string;
  attributesJson?: string;
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "item";
}
