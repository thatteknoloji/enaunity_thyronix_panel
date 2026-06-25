import { validateGeneratedContent } from "@/lib/ai-writer/ai-content-writer";
import type { BlogArticleOutput, PageContentOutput } from "@/lib/ai-writer/types";
import { AI_BRAIN_BANNED_PHRASES } from "./ai-brain-prompts";
import type { BrainMetadata } from "./ai-brain-types";

function hasDuplicateParagraphs(blocks: string[]): boolean {
  const normalized = blocks.map((b) => b.toLowerCase().replace(/\s+/g, " ").trim()).filter(Boolean);
  return new Set(normalized).size < normalized.length;
}

function detectBanned(text: string): string[] {
  const lower = text.toLowerCase();
  return AI_BRAIN_BANNED_PHRASES.filter((p) => lower.includes(p));
}

export function runFinalQualityGate(
  contentType: "BLOG" | "PAGE" | "GEO" | "RECOVERY",
  draft: BlogArticleOutput | PageContentOutput,
  metadata: Pick<BrainMetadata, "primaryIntent" | "entityMap">
) {
  const base = validateGeneratedContent({
    contentType,
    h1: "content" in draft ? draft.content.h1 : draft.h1,
    intro: "content" in draft ? draft.content.intro : draft.intro,
    sections: "content" in draft ? draft.content.sections : draft.sections,
    conclusion: "content" in draft ? draft.content.conclusion : undefined,
    faq: draft.faq,
    seoTitle: draft.seoTitle,
    seoDescription: draft.seoDescription,
    schema: draft.schema,
    keyword: "content" in draft ? draft.content.h1 : draft.h1,
  });

  const blocks = [
    "content" in draft ? draft.content.intro : draft.intro,
    ...("content" in draft ? draft.content.sections.map((s) => s.body) : draft.sections.map((s) => s.body)),
  ];
  const duplicate = hasDuplicateParagraphs(blocks);
  const banned = detectBanned(blocks.join("\n"));

  const issues = [...base.issues];
  if (!metadata.primaryIntent) issues.push("intent metadata eksik");
  if (!metadata.entityMap?.length) issues.push("entity map eksik");
  if (!("cta" in draft && draft.cta?.trim())) issues.push("CTA eksik");
  if (duplicate) issues.push("aynı paragrafın birebir tekrarı var");
  if (banned.length) issues.push(`yasaklı ifade: ${banned.join(", ")}`);

  const score = Math.max(0, 100 - issues.length * 8);
  const passed = issues.length === 0 && score >= 75;
  return { passed, score, issues, wordCount: base.wordCount };
}
