import { AI_PAGE_KINDS } from "@/lib/ai-writer/constants";
import { generatePageContent } from "@/lib/ai-writer/ai-content-writer";
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

  const aiResult = await generatePageContent({
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
          aiWriter: aiResult.metadata,
          generationError: aiResult.error,
        },
        contentPolicyWarnings: [
          ...payload.contentPolicyWarnings,
          `AI içerik üretimi başarısız: ${aiResult.error || "bilinmeyen hata"}`,
        ],
      },
      aiMetadata: aiResult.metadata,
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
      aiWriter: aiResult.metadata,
      aiGenerated: true,
    },
    status: aiResult.metadata.validationIssues?.length ? "NEEDS_REVIEW" : payload.status,
    contentPolicyWarnings: [
      ...payload.contentPolicyWarnings,
      ...(aiResult.metadata.validationIssues || []),
    ],
  };

  return { payload: enriched, aiMetadata: aiResult.metadata };
}
