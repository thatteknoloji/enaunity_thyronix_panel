import {
  generateBlogArticle,
  generatePageContent,
  generateRecoveryContent,
  getProviderStatus,
} from "@/lib/ai-writer/ai-content-writer";
import type { BlogArticleInput, BlogArticleOutput, PageContentInput, PageContentOutput } from "@/lib/ai-writer/types";
import { WRITER_VERSION } from "@/lib/ai-writer/constants";
import { buildResearchSummary, buildSmartOutline } from "./ai-brain-prompts";
import { extractEntitiesFromInput } from "./ai-brain-entities";
import { runEditorialRevision as applyEditorialRevision } from "./ai-brain-revision";
import { runFinalQualityGate } from "./ai-brain-validator";
import {
  AI_BRAIN_VERSION,
  type BrainInput,
  type BrainMetadata,
  type SearchIntentType,
  type SmartBlogResult,
  type SmartOutline,
  type SmartPageResult,
} from "./ai-brain-types";

let lastRun: string | null = null;
let lastError: string | null = null;

function analyzeIntent(input: BrainInput): { primaryIntent: SearchIntentType; secondaryIntents: SearchIntentType[] } {
  const text = `${input.keyword || ""} ${input.sourceUrl || ""} ${input.oldSlug || ""}`.toLowerCase();
  if (text.includes("fiyat") || text.includes("satın") || text.includes("teklif")) {
    return { primaryIntent: "TRANSACTIONAL", secondaryIntents: ["COMMERCIAL"] };
  }
  if (input.province || input.district) return { primaryIntent: "LOCAL", secondaryIntents: ["COMMERCIAL", "INFORMATIONAL"] };
  if (text.includes("karşılaştır")) return { primaryIntent: "COMPARISON", secondaryIntents: ["INFORMATIONAL"] };
  if (text.includes("sorun") || text.includes("hata")) return { primaryIntent: "PROBLEM_SOLUTION", secondaryIntents: ["INFORMATIONAL"] };
  return { primaryIntent: "INFORMATIONAL", secondaryIntents: ["COMMERCIAL"] };
}

function toMetadata(params: {
  provider: string | null;
  model: string | null;
  input: BrainInput;
  outline: SmartOutline;
  qualityScore: number;
  qualityIssues: string[];
  wordCount: number;
  success: boolean;
  fallbackUsed: boolean;
  revisionApplied?: boolean;
  enrichmentApplied?: boolean;
}): BrainMetadata {
  const intent = analyzeIntent(params.input);
  const entityMap = extractEntitiesFromInput(params.input);
  return {
    brainVersion: AI_BRAIN_VERSION,
    writerVersion: WRITER_VERSION,
    provider: params.provider,
    model: params.model,
    primaryIntent: intent.primaryIntent,
    secondaryIntents: intent.secondaryIntents,
    entityMap,
    outline: params.outline,
    researchSummary: buildResearchSummary(params.input),
    competitorStructureUsed: !!params.input.competitorStructure,
    revisionApplied: !!params.revisionApplied,
    enrichmentApplied: !!params.enrichmentApplied,
    finalQualityScore: params.qualityScore,
    qualityIssues: params.qualityIssues,
    wordCount: params.wordCount,
    aiGenerated: params.success,
    fallbackUsed: params.fallbackUsed,
    generationStatus: params.success ? "SUCCESS" : "REVIEW",
  };
}

function applyEnrichment<T extends BlogArticleOutput | PageContentOutput>(draft: T, input: BrainInput): T {
  const location = [input.province, input.district].filter(Boolean).join(" / ");
  const add = location ? ` ${location} özel ihtiyaçları da ele alınır.` : "";
  return {
    ...draft,
    seoDescription: `${draft.seoDescription}${add}`.trim(),
    cta: "cta" in draft ? draft.cta || "Teklif iste" : undefined,
  };
}

export function runContentResearch(input: BrainInput) {
  return buildResearchSummary(input);
}
export function analyzeSearchIntent(input: BrainInput) {
  return analyzeIntent(input);
}
export function extractEntityMap(input: BrainInput) {
  return extractEntitiesFromInput(input);
}
export function analyzeCompetitorStructure(input: BrainInput) {
  return { used: !!input.competitorStructure, length: (input.competitorStructure || "").length };
}
export function generateSmartOutline(input: BrainInput) {
  return buildSmartOutline(input);
}
export function runEditorialRevision<T extends BlogArticleOutput | PageContentOutput>(draft: T) {
  return applyEditorialRevision(draft);
}
export function enrichForSeoGeoAeo<T extends BlogArticleOutput | PageContentOutput>(draft: T, input: BrainInput) {
  return applyEnrichment(draft, input);
}
export function runFinalQualityGateForBrain(
  type: "BLOG" | "PAGE" | "GEO" | "RECOVERY",
  draft: BlogArticleOutput | PageContentOutput,
  input: BrainInput
) {
  const intent = analyzeIntent(input);
  return runFinalQualityGate(type, draft, {
    primaryIntent: intent.primaryIntent,
    entityMap: extractEntitiesFromInput(input),
  });
}

export async function generateSmartBlogContent(input: BlogArticleInput): Promise<SmartBlogResult> {
  const outline = generateSmartOutline(input);
  const ai = await generateBlogArticle(input);
  const provider = ai.metadata.provider;
  const model = ai.metadata.model;
  if (!ai.data) {
    const meta = toMetadata({
      provider,
      model,
      input,
      outline,
      qualityScore: 0,
      qualityIssues: [ai.error || "AI üretim başarısız"],
      wordCount: 0,
      success: false,
      fallbackUsed: ai.metadata.fallbackUsed,
    });
    lastRun = new Date().toISOString();
    lastError = ai.error || "AI üretim başarısız";
    return { success: false, error: ai.error || "AI üretim başarısız", metadata: meta };
  }
  const revised = applyEditorialRevision(ai.data);
  const enriched = applyEnrichment(revised, input);
  const quality = runFinalQualityGateForBrain(input.sourceType === "GEO" ? "GEO" : "BLOG", enriched, input);
  const meta = toMetadata({
    provider,
    model,
    input,
    outline,
    qualityScore: quality.score,
    qualityIssues: quality.issues,
    wordCount: quality.wordCount,
    success: ai.success && quality.passed,
    fallbackUsed: ai.metadata.fallbackUsed,
    revisionApplied: true,
    enrichmentApplied: true,
  });
  lastRun = new Date().toISOString();
  lastError = quality.passed ? null : quality.issues.join("; ");
  return {
    success: ai.success && quality.passed,
    error: quality.passed ? undefined : quality.issues.join("; "),
    data: enriched,
    metadata: meta,
  };
}

export async function generateSmartPageContent(input: PageContentInput): Promise<SmartPageResult> {
  const outline = generateSmartOutline({ keyword: input.targetQuery, category: input.category || undefined, province: input.province || undefined });
  const ai = await generatePageContent(input);
  if (!ai.data) {
    const meta = toMetadata({
      provider: ai.metadata.provider,
      model: ai.metadata.model,
      input: { keyword: input.targetQuery, category: input.category || undefined, province: input.province || undefined },
      outline,
      qualityScore: 0,
      qualityIssues: [ai.error || "AI üretim başarısız"],
      wordCount: 0,
      success: false,
      fallbackUsed: ai.metadata.fallbackUsed,
    });
    lastRun = new Date().toISOString();
    lastError = ai.error || "AI üretim başarısız";
    return { success: false, error: ai.error, metadata: meta };
  }
  const revised = applyEditorialRevision(ai.data);
  const enriched = applyEnrichment(revised, { keyword: input.targetQuery, category: input.category || undefined, province: input.province || undefined });
  const quality = runFinalQualityGateForBrain("PAGE", enriched, { keyword: input.targetQuery, category: input.category || undefined, province: input.province || undefined });
  const meta = toMetadata({
    provider: ai.metadata.provider,
    model: ai.metadata.model,
    input: { keyword: input.targetQuery, category: input.category || undefined, province: input.province || undefined },
    outline,
    qualityScore: quality.score,
    qualityIssues: quality.issues,
    wordCount: quality.wordCount,
    success: ai.success && quality.passed,
    fallbackUsed: ai.metadata.fallbackUsed,
    revisionApplied: true,
    enrichmentApplied: true,
  });
  lastRun = new Date().toISOString();
  lastError = quality.passed ? null : quality.issues.join("; ");
  return { success: ai.success && quality.passed, error: quality.passed ? undefined : quality.issues.join("; "), data: enriched, metadata: meta };
}

export async function generateSmartRecoveryContent(input: {
  slug: string;
  estimatedTitle: string;
  category?: string | null;
  legacyUrl: string;
  contentType: "BLOG" | "PAGE";
}) {
  const ai = await generateRecoveryContent(input);
  return ai;
}

export async function generateSmartProductContent(input: BlogArticleInput) {
  return generateSmartBlogContent({ ...input, sourceType: "PRODUCT" });
}
export async function generateSmartGeoContent(input: BlogArticleInput) {
  return generateSmartBlogContent({ ...input, sourceType: "GEO" });
}
export async function generateSmartCategoryContent(input: BlogArticleInput) {
  return generateSmartBlogContent({ ...input, sourceType: "CATEGORY" });
}

export function getAiBrainStatus() {
  const provider = getProviderStatus();
  return {
    activeProvider: provider.activeProvider,
    model: provider.model,
    ready: provider.ready,
    brainVersion: AI_BRAIN_VERSION,
    lastRun,
    lastError,
  };
}
