export const BLOG_ENGINE_VERSION = "ENA_BLOG_ENGINE_V1" as const;

export type BlogSourceType =
  | "KEYWORD"
  | "KEYWORD_GROUP"
  | "PRODUCT"
  | "CATEGORY"
  | "GEO"
  | "COMPETITOR_STRUCTURE";

export type BlogPostStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";

export type BlogContentSection = {
  id: string;
  type: "intro" | "guide" | "comparison" | "benefits" | "purchase" | "usage" | "faq_block" | "conclusion" | "custom";
  heading: string;
  body: string;
};

export type BlogContentPayload = {
  version: typeof BLOG_ENGINE_VERSION;
  h1: string;
  intro: string;
  sections: BlogContentSection[];
  conclusion: string;
};

export type BlogFaqItem = {
  question: string;
  answer: string;
};

export type BlogInternalLink = {
  type: "product" | "blog" | "category";
  title: string;
  href: string;
  reason: string;
};

export type BlogQualityResult = {
  passed: boolean;
  originalityScore: number;
  seoScore: number;
  geoScore: number;
  qualityScore: number;
  checks: Array<{ id: string; label: string; passed: boolean }>;
  warnings: string[];
};

export type BlogGenerateOptions = {
  projectId?: string | null;
  dealerId?: string | null;
  dryRun?: boolean;
  autoPublish?: boolean;
  keyword?: string;
  keywords?: string[];
  keywordGroup?: string;
  productId?: string;
  category?: string;
  province?: string;
  district?: string;
  competitorStructure?: string;
  competitorUrl?: string;
  tags?: string[];
};

export type BlogPreviewResult = {
  dryRun: true;
  title: string;
  slug: string;
  excerpt: string;
  content: BlogContentPayload;
  faq: BlogFaqItem[];
  schema: Record<string, unknown>;
  internalLinks: BlogInternalLink[];
  seoTitle: string;
  seoDescription: string;
  quality: BlogQualityResult;
  sourceType: BlogSourceType;
};

export type BlogGenerateResult = {
  dryRun: boolean;
  created: boolean;
  updated: boolean;
  postId?: string;
  slug: string;
  title: string;
  status: BlogPostStatus;
  quality: BlogQualityResult;
  warnings: string[];
};

export type BlogBatchGenerateResult = {
  dryRun: boolean;
  results: BlogGenerateResult[];
  total: number;
  created: number;
  updated: number;
  warnings: string[];
};

export const BLOG_GEO_PROVINCES = [
  "İstanbul",
  "Ankara",
  "İzmir",
  "Bursa",
  "Antalya",
  "Konya",
  "Adana",
  "Gaziantep",
  "Kocaeli",
  "Mersin",
] as const;
