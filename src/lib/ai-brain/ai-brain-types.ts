import type { BlogArticleOutput, PageContentOutput } from "@/lib/ai-writer/types";
import type { BlogSourceType } from "@/lib/blog-engine/blog-types";

export const AI_BRAIN_VERSION = "ENA_AKILLI_ICERIK_BEYNI_V2" as const;

export type SearchIntentType =
  | "INFORMATIONAL"
  | "COMMERCIAL"
  | "TRANSACTIONAL"
  | "LOCAL"
  | "COMPARISON"
  | "PROBLEM_SOLUTION";

export type BrainInput = {
  keyword?: string;
  keywordGroup?: string;
  product?: string;
  category?: string | null;
  province?: string | null;
  district?: string | null;
  sourceUrl?: string | null;
  oldSlug?: string | null;
  competitorStructure?: string | null;
  sourceType?: BlogSourceType;
};

export type ResearchSummary = {
  targetAudience: string;
  coreNeed: string;
  scope: string[];
  headingSuggestions: string[];
  questionsToAnswer: string[];
};

export type SmartOutline = {
  h1: string;
  intro: string;
  sections: string[];
  faqQuestions: string[];
  conclusion: string;
  cta: string;
  internalLinkSuggestions: {
    relatedBlogs: string[];
    relatedProducts: string[];
    relatedPages: string[];
    relatedCategories: string[];
  };
  schemaSuggestion: Array<"BlogPosting" | "FAQPage" | "BreadcrumbList" | "Product" | "LocalBusiness" | "Article">;
};

export type BrainMetadata = {
  brainVersion: typeof AI_BRAIN_VERSION;
  writerVersion?: string;
  provider: string | null;
  model: string | null;
  primaryIntent: SearchIntentType;
  secondaryIntents: SearchIntentType[];
  entityMap: string[];
  outline: SmartOutline;
  researchSummary: ResearchSummary;
  competitorStructureUsed: boolean;
  revisionApplied: boolean;
  enrichmentApplied: boolean;
  finalQualityScore: number;
  qualityIssues: string[];
  wordCount: number;
  aiGenerated: boolean;
  fallbackUsed: boolean;
  generationStatus: "SUCCESS" | "FAILED" | "REVIEW";
};

export type SmartBlogResult = {
  success: boolean;
  error?: string;
  data?: BlogArticleOutput;
  metadata: BrainMetadata;
};

export type SmartPageResult = {
  success: boolean;
  error?: string;
  data?: PageContentOutput;
  metadata: BrainMetadata;
};
