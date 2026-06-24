export type LegacyUrlClassification =
  | "BLOG"
  | "PRODUCT"
  | "CATEGORY"
  | "LANDING"
  | "FAQ"
  | "GEO"
  | "UNKNOWN";

export type LegacyUrlRecoveryStrategy =
  | "CREATE_BLOG"
  | "CREATE_PAGE"
  | "REDIRECT_301"
  | "GONE_410"
  | "IGNORE";

export type LegacyUrlStatus =
  | "IMPORTED"
  | "ANALYZED"
  | "PLANNED"
  | "GENERATED"
  | "COMPLETED"
  | "GONE";

export type LegacyUrlImportRow = {
  url: string;
  lastmod?: string | null;
  source?: string | null;
};

export type LegacyClassificationResult = {
  classification: LegacyUrlClassification;
  confidenceScore: number;
  keyword: string;
  notes: string;
};

export type LegacyRecoveryPlan = {
  strategy: LegacyUrlRecoveryStrategy;
  confidenceScore: number;
  suggestedTargetUrl: string | null;
  notes: string;
};

export type LegacyRecoveryStats = {
  total: number;
  imported: number;
  analyzed: number;
  planned: number;
  generated: number;
  completed: number;
  blogRecovery: number;
  pageRecovery: number;
  redirect301: number;
  gone410: number;
  pending: number;
};

export type LegacyBulkResult = {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
};
