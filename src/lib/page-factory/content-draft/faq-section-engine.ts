import { makeId } from "@/lib/aeo/aeo-utils";
import { generateFaqBlocks } from "@/lib/aeo/faq-block-engine";
import { generateCitationHints } from "@/lib/aeo/citation-hint-engine";
import type { ContentDraftFaq } from "./draft-types";
import type { DraftContext } from "./draft-types";
import { productName } from "./draft-utils";

export function generateFaqSection(ctx: DraftContext): ContentDraftFaq[] {
  if (ctx.aeo?.faqBlocks?.length) {
    return ctx.aeo.faqBlocks.slice(0, 10).map((f, i) => ({
      id: f.id || makeId("faq", i),
      question: f.question,
      answer: f.answer,
    }));
  }

  if (!ctx.product) {
    return [
      {
        id: makeId("faq", 0),
        question: `${productName(ctx)} nedir?`,
        answer: "Ürün verisine dayalı detaylar ürün sayfasında yer alır.",
      },
    ];
  }

  const citations = generateCitationHints(
    {
      product: ctx.product,
      entities: ctx.entities,
      attributes: ctx.attributes,
      images: ctx.images,
      contentDNA: ctx.contentDNA,
    },
    ctx.metadata
  );

  const faqBlocks = generateFaqBlocks(
    {
      product: ctx.product,
      entities: ctx.entities,
      attributes: ctx.attributes,
      images: ctx.images,
      contentDNA: ctx.contentDNA,
    },
    ctx.blueprintKind,
    ctx.metadata,
    citations
  );

  return faqBlocks.slice(0, 10).map((f, i) => ({
    id: f.id || makeId("faq", i),
    question: f.question,
    answer: f.answer,
  }));
}
