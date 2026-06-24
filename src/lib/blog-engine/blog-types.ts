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

export type BlogInternalLinkSuggestion = {
  title: string;
  href: string;
  reason: string;
};

/** @deprecated Düz dizi — BlogInternalLinksPayload kullanın */
export type BlogInternalLink = BlogInternalLinkSuggestion & {
  type: "product" | "blog" | "category" | "page";
};

export type BlogInternalLinksPayload = {
  relatedPages: BlogInternalLinkSuggestion[];
  relatedProducts: BlogInternalLinkSuggestion[];
  relatedBlogs: BlogInternalLinkSuggestion[];
  relatedCategories: BlogInternalLinkSuggestion[];
  relatedGeoBlogs?: BlogInternalLinkSuggestion[];
  relatedCategoryBlogs?: BlogInternalLinkSuggestion[];
};

export type ProductBlogType = "usage" | "benefits" | "comparison" | "purchase" | "faq";

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
  productBlogType?: ProductBlogType;
  category?: string;
  province?: string;
  district?: string;
  geoSlugMode?: "PROVINCE" | "DISTRICT";
  competitorStructure?: string;
  competitorUrl?: string;
  tags?: string[];
  debugTemplateFallback?: boolean;
};

export type BlogPreviewResult = {
  dryRun: true;
  title: string;
  slug: string;
  excerpt: string;
  content: BlogContentPayload;
  faq: BlogFaqItem[];
  schema: Record<string, unknown>;
  internalLinks: BlogInternalLinksPayload;
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

import { getDefaultGeoCities, TURKIYE_GEO_FALLBACK_PROVINCES } from "@/lib/geo/turkiye-geo-source";

/** @deprecated BLOG_GEO_PROVINCES — getGeoCitiesFromDbOrFallback / getDefaultGeoCities kullanın */
export const BLOG_GEO_PROVINCES = TURKIYE_GEO_FALLBACK_PROVINCES;
