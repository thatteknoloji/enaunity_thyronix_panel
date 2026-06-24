export type ContentQualityContentType = "BLOG" | "PAGE" | "PRODUCT" | "RECOVERY_PAGE";

export type ContentQualityIssueType =
  | "MISSING_META"
  | "MISSING_FAQ"
  | "MISSING_SCHEMA"
  | "LOW_CONTENT"
  | "LOW_GEO"
  | "LOW_AEO"
  | "LOW_SEO"
  | "BROKEN_INTERNAL_LINK"
  | "DUPLICATE_RISK";

export type ContentQualityIssue = {
  type: ContentQualityIssueType;
  severity: "critical" | "warning" | "info";
  message: string;
  field?: string;
};

export type ContentQualityRecommendation = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action?: string;
};

export type ContentAuditInput = {
  contentType: ContentQualityContentType;
  contentId: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  keyword?: string;
  province?: string | null;
  district?: string | null;
  bodyText: string;
  h2Count: number;
  faq: Array<{ question: string; answer: string }>;
  schema: Record<string, unknown> | null;
  internalLinks: {
    blogs: number;
    pages: number;
    products: number;
  };
  canonical?: string | null;
  existingSeoScore?: number;
  existingGeoScore?: number;
  existingAeoScore?: number;
  existingQualityScore?: number;
};

export type ContentAuditResult = {
  contentType: ContentQualityContentType;
  contentId: string;
  title: string;
  seoScore: number;
  geoScore: number;
  aeoScore: number;
  qualityScore: number;
  contentHealthScore: number;
  internalLinkScore: number;
  schemaScore: number;
  metaScore: number;
  issues: ContentQualityIssue[];
  recommendations: ContentQualityRecommendation[];
};

export type ContentQualityDashboard = {
  totalContent: number;
  avgSeo: number;
  avgGeo: number;
  avgAeo: number;
  avgQuality: number;
  criticalIssues: number;
  byType: Record<ContentQualityContentType, number>;
  worst: ContentAuditSummary[];
  best: ContentAuditSummary[];
  mostIssues: ContentAuditSummary[];
};

export type ContentAuditSummary = {
  id: string;
  contentType: ContentQualityContentType;
  contentId: string;
  title: string;
  qualityScore: number;
  issueCount: number;
  auditedAt: string;
};
