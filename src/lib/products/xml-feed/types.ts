import type { CategoryMapping, GroupedProduct } from "../marketplace-import/types";

export type XmlFeedTemplateId = "leyna_v2" | "leyna" | "generic" | "custom";

export type XmlFieldMapping = Record<string, string>;

export type XmlFeedRules = {
  fixedBrand: string;
  priceSource: "realPrice" | "price" | "listPrice";
  priceMultiplier: number;
  applyMarginPerVariant: boolean;
  stripBrandFromTitle: boolean;
  stripBrandFromDescription: boolean;
  brandAliasesFromFeed: boolean;
  extraBrandAliases: string[];
  titlePrefix: string;
  titleSuffix: string;
  syncIntervalHours: number;
  autoCreateCategories: boolean;
  deactivateMissing: boolean;
  updateStockOnSync: boolean;
  updateImagesOnSync: boolean;
  roundPriceTo: number;
};

export type XmlFeedConfig = {
  id?: string;
  name: string;
  feedUrl: string;
  rootCategory: string;
  templateId: XmlFeedTemplateId;
  mappingJson: XmlFieldMapping;
  variantMappingJson: XmlFieldMapping;
  categoryMappingJson: CategoryMapping;
  rulesJson: XmlFeedRules;
  syncIntervalHours: number;
};

export type XmlFeedTestResult = {
  ok: boolean;
  productCount: number;
  detectedFields: string[];
  variantFields: string[];
  categoryValues: string[];
  brandValues: string[];
  sampleValues: Record<string, string>;
  error?: string;
};

export type XmlFeedPreviewResult = {
  groups: GroupedProduct[];
  categoryValues: string[];
  totalRows: number;
  groupCount: number;
  errors: string[];
};

export type XmlFeedSyncReport = {
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
  durationMs: number;
};

export type FieldLocks = Record<string, boolean>;

export const DEFAULT_XML_FEED_RULES: XmlFeedRules = {
  fixedBrand: "Ena Unity",
  priceSource: "realPrice",
  priceMultiplier: 1.25,
  applyMarginPerVariant: true,
  stripBrandFromTitle: true,
  stripBrandFromDescription: true,
  brandAliasesFromFeed: true,
  extraBrandAliases: [],
  titlePrefix: "",
  titleSuffix: "",
  syncIntervalHours: 12,
  autoCreateCategories: true,
  deactivateMissing: false,
  updateStockOnSync: true,
  updateImagesOnSync: false,
  roundPriceTo: 0,
};

export const PRODUCT_LOCKABLE_FIELDS = [
  "name",
  "description",
  "brand",
  "price",
  "category",
  "subcategory",
  "seoTitle",
  "seoDescription",
  "image",
  "images",
] as const;

export const VARIANT_LOCKABLE_FIELDS = ["price", "stock", "sku", "barcode", "image"] as const;
