import type { BlogContentPayload, BlogFaqItem } from "@/lib/blog-engine/blog-types";

export type AiProviderName = "OPENAI" | "GEMINI" | "ANTHROPIC" | "OPENROUTER" | "OLLAMA";

export type GenerationStatus = "SUCCESS" | "FAILED";

export type AiWriterMetadata = {
  writerVersion: typeof import("./constants").WRITER_VERSION;
  provider: AiProviderName | null;
  model: string | null;
  generatedAt: string;
  promptHash: string;
  wordCount: number;
  aiGenerated: boolean;
  fallbackUsed: boolean;
  generationStatus: GenerationStatus;
  generationError: string | null;
  validationIssues?: string[];
  thinContent?: boolean;
  finalQualityScore?: number;
};

export type ContentValidationResult = {
  passed: boolean;
  issues: string[];
  wordCount: number;
  sectionCount: number;
  faqCount: number;
  hasH1: boolean;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  hasJsonLd: boolean;
  hasDuplicateParagraphs: boolean;
  hasBannedPhrases: boolean;
};

export type AiGenerateResult<T> = {
  success: boolean;
  error?: string;
  data?: T;
  metadata: AiWriterMetadata;
};

export type BlogArticleInput = {
  keyword: string;
  sourceType: "KEYWORD" | "KEYWORD_GROUP" | "PRODUCT" | "CATEGORY" | "GEO" | "COMPETITOR_STRUCTURE";
  category?: string | null;
  province?: string | null;
  district?: string | null;
  productName?: string | null;
  competitorStructure?: string | null;
  competitorUrl?: string | null;
  debugTemplateFallback?: boolean;
};

export type BlogArticleOutput = {
  title: string;
  slugBase?: string;
  content: BlogContentPayload;
  faq: BlogFaqItem[];
  seoTitle: string;
  seoDescription: string;
  schema: Record<string, unknown>;
  internalLinkSuggestions: Array<{ title: string; href: string; reason: string }>;
  excerpt: string;
};

export type PageContentInput = {
  pageType: string;
  blueprintKind: string;
  title: string;
  targetQuery: string;
  productName?: string | null;
  category?: string | null;
  province?: string | null;
  features?: string[];
  aeoBlocks?: Array<{ type: string; answer: string }>;
  debugTemplateFallback?: boolean;
};

export type PageContentOutput = {
  h1: string;
  intro: string;
  sections: Array<{ heading: string; body: string; type?: string }>;
  faq: BlogFaqItem[];
  seoTitle: string;
  seoDescription: string;
  schema: Record<string, unknown>;
  internalLinkSuggestions: Array<{ title: string; href: string; reason: string }>;
  cta?: string;
};

export type RecoveryContentInput = {
  slug: string;
  estimatedTitle: string;
  category?: string | null;
  legacyUrl: string;
  archiveText?: string | null;
  competitorStructure?: string | null;
  contentType: "BLOG" | "PAGE";
  debugTemplateFallback?: boolean;
};

export type ProviderCallResult = {
  success: boolean;
  content: string;
  provider: AiProviderName;
  model: string;
  error?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
};

export type ProviderStatus = {
  configuredProviders: AiProviderName[];
  activeProvider: AiProviderName | null;
  model: string | null;
  ready: boolean;
};
