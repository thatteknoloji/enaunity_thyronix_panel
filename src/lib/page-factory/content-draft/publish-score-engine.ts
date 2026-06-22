import type { PageFactoryContentDraftStatus } from "@prisma/client";
import type { ContentDraftPayload } from "./draft-types";

export type PublishScoreInput = {
  payload: Pick<
    ContentDraftPayload,
    | "title"
    | "metaDescription"
    | "intro"
    | "sections"
    | "faq"
    | "schemaDraft"
    | "internalLinks"
    | "quality"
    | "noindexRecommended"
  >;
  productQualityScore?: number;
};

export function calculatePublishScore(input: PublishScoreInput): number {
  const p = input.payload;
  let score = 0;

  if (p.title?.trim()) score += 10;
  if (p.metaDescription?.trim()) score += 10;
  if (p.intro?.trim()) score += 10;
  if (p.sections.length >= 5) score += 15;
  else if (p.sections.length >= 3) score += 8;
  if (p.faq.length >= 4) score += 15;
  else if (p.faq.length >= 2) score += 8;
  if (p.schemaDraft && Object.keys(p.schemaDraft).length > 0) score += 15;
  if (p.internalLinks.length >= 3) score += 10;
  else if (p.internalLinks.length >= 1) score += 5;
  if (p.quality.aeoScore >= 70) score += 10;
  else if (p.quality.aeoScore >= 50) score += 5;
  if (!p.noindexRecommended) score += 5;

  if (p.noindexRecommended) score = Math.min(score, 79);

  const pqs = input.productQualityScore ?? 100;
  if (pqs < 40) return Math.min(score, 30);

  return Math.min(100, score);
}

export function calculateSeoScore(payload: ContentDraftPayload): number {
  let score = 0;
  if (payload.metaTitle.length >= 45 && payload.metaTitle.length <= 70) score += 25;
  else if (payload.metaTitle) score += 12;
  if (payload.metaDescription.length >= 130 && payload.metaDescription.length <= 160) score += 25;
  else if (payload.metaDescription) score += 12;
  if (payload.h1?.trim()) score += 20;
  if (payload.sections.length >= 5) score += 20;
  else if (payload.sections.length >= 3) score += 10;
  if (payload.faq.length >= 4) score += 10;
  return Math.min(100, score);
}

export function calculateGeoScore(payload: ContentDraftPayload): number {
  if (payload.blueprintType !== "PRODUCT_GEO") {
    const hasGeo = payload.sections.some((s) => s.type === "GEO_CONTEXT");
    return hasGeo ? 40 : 0;
  }
  let score = 0;
  if (payload.sections.some((s) => s.type === "GEO_CONTEXT")) score += 40;
  if (payload.internalLinks.some((l) => l.targetType === "geoSibling")) score += 30;
  if (payload.quality.aeoScore > 0) score += 30;
  return Math.min(100, score);
}

export function resolveDraftStatus(
  publishScore: number,
  noindexRecommended: boolean,
  productQualityScore: number
): PageFactoryContentDraftStatus {
  if (productQualityScore < 40) return "REJECTED";
  if (noindexRecommended) {
    if (publishScore >= 50) return "NEEDS_REVIEW";
    return "DRAFT";
  }
  if (publishScore >= 80) return "READY_TO_PUBLISH";
  if (publishScore >= 50) return "NEEDS_REVIEW";
  return "DRAFT";
}

export function resolveBlueprintContentStatus(status: PageFactoryContentDraftStatus): string {
  switch (status) {
    case "READY_TO_PUBLISH":
      return "READY_TO_PUBLISH";
    case "NEEDS_REVIEW":
      return "NEEDS_REVIEW";
    case "REJECTED":
      return "REJECTED";
    default:
      return "DRAFT_GENERATED";
  }
}
