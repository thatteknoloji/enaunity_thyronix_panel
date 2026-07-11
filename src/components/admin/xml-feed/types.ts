import type { XmlFeedRules } from "@/lib/products/xml-feed/types";

export type XmlWizardStep = "setup" | "mapping" | "rules" | "preview" | "categories" | "done";

export const WIZARD_STEPS: { id: XmlWizardStep; label: string }[] = [
  { id: "setup", label: "1. Feed" },
  { id: "mapping", label: "2. Alan Eşleme" },
  { id: "rules", label: "3. Kurallar" },
  { id: "preview", label: "4. Önizleme" },
  { id: "categories", label: "5. Kategori" },
  { id: "done", label: "6. Tamam" },
];

export interface XmlFeedListItem {
  id: string;
  name: string;
  feedUrl: string;
  rootCategory: string;
  status: string;
  templateId: string;
  syncIntervalHours: number;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  lastSyncStatus: string;
  productCount: number;
  hasCustomMapping?: boolean;
}

export interface XmlFeedTestState {
  productCount: number;
  categoryValues: string[];
  brandValues: string[];
  detectedFields: string[];
  variantFields: string[];
  sampleValues: Record<string, string>;
  error?: string;
}

export interface XmlPreviewGroup {
  modelCode: string;
  name: string;
  category: string;
  variantCount?: number;
  rows?: unknown[];
  price?: number;
  stock?: number;
  brand?: string;
  errors?: string[];
}

export interface XmlPreviewState {
  groups: XmlPreviewGroup[];
  categoryValues: string[];
  totalRows: number;
  groupCount: number;
  unmappedCategories: string[];
  errors: string[];
  parseErrors?: string[];
  suggestedCategoryMapping: Record<string, string>;
  appliedRules?: XmlFeedRules;
}

export interface XmlSyncReport {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
  status: string;
}

export const FEED_TEMPLATES = [
  { id: "leyna_v2", label: "Leyna v2", desc: "realPrice + varyant name1/value1" },
  { id: "leyna", label: "Leyna (legacy)", desc: "sitePrice formatı" },
  { id: "ikas", label: "ikas Export", desc: "sellPrice + category_path" },
  { id: "generic", label: "Generic XML", desc: "Standart alan adları" },
  { id: "custom", label: "Özel XML", desc: "Alan eşlemeyi manuel yap" },
] as const;
