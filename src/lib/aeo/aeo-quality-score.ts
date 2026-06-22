import type { AeoBlueprintPayload } from "./aeo-types";

export type AeoQualityInput = {
  answerBlocks: AeoBlueprintPayload["answerBlocks"];
  faqBlocks: AeoBlueprintPayload["faqBlocks"];
  schemaHints: AeoBlueprintPayload["schemaHints"];
  citationHints: AeoBlueprintPayload["citationHints"];
  entityCount: number;
  hasImage: boolean;
  hasDescriptionClean: boolean;
  noindexRecommended: boolean;
};

export function calculateAeoQualityScore(input: AeoQualityInput): number {
  let score = 0;

  const hasQuickAnswer = input.answerBlocks.some((b) => b.type === "QUICK_ANSWER" && b.answer.length >= 100);
  if (hasQuickAnswer) score += 20;

  if (input.faqBlocks.length >= 4) score += 20;
  else if (input.faqBlocks.length >= 2) score += 10;

  if (input.schemaHints.length > 0) score += 15;

  if (input.entityCount >= 3) score += 15;
  else if (input.entityCount >= 1) score += 8;

  if (input.hasImage) score += 10;
  if (input.hasDescriptionClean) score += 10;
  if (input.citationHints.length > 0) score += 10;

  if (input.noindexRecommended) {
    score = Math.min(score, 60);
  }

  return Math.min(100, Math.max(0, score));
}
