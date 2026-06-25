import { AI_PAGE_KINDS } from "@/lib/ai-writer/constants";
import { generateSmartPageContent } from "@/lib/ai-brain/ai-brain-service";
import type { AiWriterMetadata } from "@/lib/ai-writer/types";
import { makeId } from "@/lib/aeo/aeo-utils";
import type { ContentDraftPayload, ContentDraftSection, DraftContext } from "./draft-types";
import { featureBullets, geoLabel, productName, targetQuery } from "./draft-utils";

const SECTION_TYPE_MAP: Record<string, ContentDraftSection["type"]> = {
  hero: "HERO",
  intro: "INTRO",
  guide: "BUYING_GUIDE",
  comparison: "COMPARISON",
  benefits: "FEATURE_GRID",
  faq: "FAQ",
  cta: "CTA",
  geo: "GEO_CONTEXT",
};

function mapAiSections(
  sections: Array<{ heading: string; body: string; type?: string }>
): ContentDraftSection[] {
  return sections.map((s, i) => ({
    id: makeId("section", i),
    type: SECTION_TYPE_MAP[(s.type || "guide").toLowerCase()] || "INTRO",
    heading: s.heading,
    content: s.body,
    bullets: [],
    entities: [],
    sourceHints: [{ sourceType: "AI_WRITER", field: "generatePageContent" }],
    metadata: { aiGenerated: true },
  }));
}

export async function enrichDraftWithAiWriter(
  ctx: DraftContext,
  payload: ContentDraftPayload
): Promise<{ payload: ContentDraftPayload; aiMetadata: AiWriterMetadata | null }> {
  const kind = ctx.blueprintKind;
  if (!AI_PAGE_KINDS.has(kind)) {
    return { payload, aiMetadata: null };
  }

  const aiResult = await generateSmartPageContent({
    pageType: ctx.blueprint.pageType,
    blueprintKind: kind,
    title: payload.title,
    targetQuery: targetQuery(ctx),
    productName: productName(ctx),
    category: ctx.product?.categoryPath,
    province: geoLabel(ctx) || undefined,
    features: featureBullets(ctx),
    aeoBlocks: ctx.aeo?.answerBlocks?.map((b) => ({ type: b.type, answer: b.answer })),
  });

  if (!aiResult.success || !aiResult.data) {
    return {
      payload: {
        ...payload,
        status: "NEEDS_REVIEW",
        sourceJson: {
          ...payload.sourceJson,
          aiWriter: {
            writerVersion: "ENA_AKILLI_ICERIK_YAZARI_V1",
            provider: aiResult.metadata.provider as AiWriterMetadata["provider"],
            model: aiResult.metadata.model,
            generatedAt: new Date().toISOString(),
            promptHash: "ai-brain-v2",
            wordCount: aiResult.metadata.wordCount,
            aiGenerated: aiResult.metadata.aiGenerated,
            fallbackUsed: aiResult.metadata.fallbackUsed,
            generationStatus: aiResult.metadata.generationStatus === "SUCCESS" ? "SUCCESS" : "FAILED",
            generationError: aiResult.error || null,
            validationIssues: aiResult.metadata.qualityIssues,
          } as AiWriterMetadata,
          generationError: aiResult.error,
        },
        contentPolicyWarnings: [
          ...payload.contentPolicyWarnings,
          `AI içerik üretimi başarısız: ${aiResult.error || "bilinmeyen hata"}`,
        ],
      },
      aiMetadata: {
        writerVersion: "ENA_AKILLI_ICERIK_YAZARI_V1",
        provider: aiResult.metadata.provider as AiWriterMetadata["provider"],
        model: aiResult.metadata.model,
        generatedAt: new Date().toISOString(),
        promptHash: "ai-brain-v2",
        wordCount: aiResult.metadata.wordCount,
        aiGenerated: aiResult.metadata.aiGenerated,
        fallbackUsed: aiResult.metadata.fallbackUsed,
        generationStatus: aiResult.metadata.generationStatus === "SUCCESS" ? "SUCCESS" : "FAILED",
        generationError: aiResult.error || null,
        validationIssues: aiResult.metadata.qualityIssues,
      },
    };
  }

  const data = aiResult.data;
  const enriched: ContentDraftPayload = {
    ...payload,
    h1: data.h1 || payload.h1,
    intro: data.intro || payload.intro,
    metaTitle: data.seoTitle || payload.metaTitle,
    metaDescription: data.seoDescription || payload.metaDescription,
    sections: mapAiSections(data.sections),
    faq: (data.faq || []).map((f, i) => ({
      id: makeId("faq", i),
      question: f.question,
      answer: f.answer,
    })),
    schemaDraft: data.schema || payload.schemaDraft,
    sourceJson: {
      ...payload.sourceJson,
      aiWriter: {
        writerVersion: "ENA_AKILLI_ICERIK_YAZARI_V1",
        provider: aiResult.metadata.provider as AiWriterMetadata["provider"],
        model: aiResult.metadata.model,
        generatedAt: new Date().toISOString(),
        promptHash: "ai-brain-v2",
        wordCount: aiResult.metadata.wordCount,
        aiGenerated: aiResult.metadata.aiGenerated,
        fallbackUsed: aiResult.metadata.fallbackUsed,
        generationStatus: aiResult.metadata.generationStatus === "SUCCESS" ? "SUCCESS" : "FAILED",
        generationError: aiResult.error || null,
        validationIssues: aiResult.metadata.qualityIssues,
      } as AiWriterMetadata,
      aiGenerated: true,
    },
    status: aiResult.metadata.qualityIssues?.length ? "NEEDS_REVIEW" : payload.status,
    contentPolicyWarnings: [
      ...payload.contentPolicyWarnings,
      ...(aiResult.metadata.qualityIssues || []),
    ],
  };

  return {
    payload: enriched,
    aiMetadata: {
      writerVersion: "ENA_AKILLI_ICERIK_YAZARI_V1",
      provider: aiResult.metadata.provider as AiWriterMetadata["provider"],
      model: aiResult.metadata.model,
      generatedAt: new Date().toISOString(),
      promptHash: "ai-brain-v2",
      wordCount: aiResult.metadata.wordCount,
      aiGenerated: aiResult.metadata.aiGenerated,
      fallbackUsed: aiResult.metadata.fallbackUsed,
      generationStatus: aiResult.metadata.generationStatus === "SUCCESS" ? "SUCCESS" : "FAILED",
      generationError: aiResult.error || null,
      validationIssues: aiResult.metadata.qualityIssues,
    },
  };
}
