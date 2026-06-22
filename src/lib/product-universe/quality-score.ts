import type { ProductUniverseStatus } from "@prisma/client";

export type QualityScoreInput = {
  rawName?: string;
  categoryPath?: string;
  descriptionClean?: string;
  imageCount?: number;
  entityCount?: number;
  hasMaterialOrSize?: boolean;
  isDuplicate?: boolean;
};

export type QualityScoreResult = {
  score: number;
  status: ProductUniverseStatus;
  warnings: string[];
};

export function calculateQualityScore(input: QualityScoreInput): QualityScoreResult {
  let score = 0;
  const warnings: string[] = [];

  if (input.rawName?.trim()) score += 15;
  else warnings.push("Ürün adı eksik");

  if (input.categoryPath?.trim()) score += 15;
  else warnings.push("Kategori eksik");

  if (input.descriptionClean && input.descriptionClean.length > 30) score += 15;
  else warnings.push("Açıklama yetersiz");

  if ((input.imageCount || 0) >= 1) score += 15;
  else warnings.push("Görsel yok");

  if ((input.entityCount || 0) >= 2) score += 15;
  else warnings.push("Entity sayısı düşük");

  if (input.hasMaterialOrSize) score += 15;
  else warnings.push("Boyut/malzeme attribute eksik");

  if (!input.isDuplicate) score += 10;
  else {
    warnings.push("Duplicate ürün");
    score = Math.max(0, score - 20);
  }

  let status: ProductUniverseStatus;
  if (score < 40) status = "REJECTED";
  else if (score < 70) status = "ANALYZED";
  else status = "BLUEPRINT_READY";

  return { score: Math.min(100, score), status, warnings };
}
