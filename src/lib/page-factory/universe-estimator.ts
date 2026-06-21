import type { RiskLevel, UniverseConfig, UniverseEstimateResult } from "./types";

const RISK_THRESHOLDS = {
  safe: 1_000,
  medium: 10_000,
  high: 100_000,
  critical: 1_000_000,
} as const;

export function getRiskLevel(estimatedTotal: number): { level: RiskLevel; label: string; canGenerate: boolean } {
  if (estimatedTotal >= RISK_THRESHOLDS.critical) {
    return { level: "blocked", label: "Çok yüksek — sadece plan oluştur", canGenerate: false };
  }
  if (estimatedTotal >= RISK_THRESHOLDS.high) {
    return { level: "critical", label: "Çok yüksek — batch önerilir", canGenerate: true };
  }
  if (estimatedTotal >= RISK_THRESHOLDS.medium) {
    return { level: "high", label: "Yüksek", canGenerate: true };
  }
  if (estimatedTotal >= RISK_THRESHOLDS.safe) {
    return { level: "medium", label: "Orta", canGenerate: true };
  }
  return { level: "safe", label: "Güvenli", canGenerate: true };
}

export function estimateUniverseTotal(input: {
  geoNodeCount: number;
  categoryCount: number;
  intentCount: number;
  includeFaq: boolean;
  includeLocalModifiers: boolean;
}): { estimatedTotal: number; pageTypeVariants: number; formula: string } {
  const categories = Math.max(input.categoryCount, 1);
  const intents = Math.max(input.intentCount, 1);
  const geoNodes = Math.max(input.geoNodeCount, 0);
  let pageTypeVariants = 1;
  if (input.includeFaq) pageTypeVariants += 1;
  if (input.includeLocalModifiers) pageTypeVariants += 1;

  const estimatedTotal = geoNodes * categories * intents * pageTypeVariants;
  const formula = `geoNodes(${geoNodes}) × kategori(${categories}) × niyet(${intents}) × pageType(${pageTypeVariants})`;

  return { estimatedTotal, pageTypeVariants, formula };
}

export function buildUniverseEstimate(
  config: UniverseConfig,
  counts: Omit<UniverseEstimateResult["counts"], "pageTypeVariants">
): UniverseEstimateResult {
  const { estimatedTotal, pageTypeVariants, formula } = estimateUniverseTotal({
    geoNodeCount: counts.geoNodes,
    categoryCount: counts.categories,
    intentCount: counts.intents,
    includeFaq: config.includeFaq,
    includeLocalModifiers: config.includeLocalModifiers,
  });

  const risk = getRiskLevel(estimatedTotal);
  const warnings: string[] = [];

  if (counts.geoNodes === 0) warnings.push("GEO düğümü seçilmedi — il/ilçe seviyesi veya ID seçin");
  if (counts.categories === 0) warnings.push("Kategori seçilmedi — en az 1 kategori gerekli");
  if (counts.intents === 0) warnings.push("Niyet seçilmedi — en az 1 niyet gerekli");
  if (estimatedTotal >= RISK_THRESHOLDS.high) {
    warnings.push("100.000+ blueprint — batch halinde üretim önerilir");
  }
  if (estimatedTotal >= RISK_THRESHOLDS.critical) {
    warnings.push("1.000.000+ blueprint — direkt generate engellendi, yalnızca tahmin/plan");
  }

  const cappedTotal = Math.min(estimatedTotal, config.maxGenerate, config.generationLimit);
  const batchSize = Math.max(1, Math.min(config.batchSize, 1000));
  const batches = cappedTotal > 0 ? Math.ceil(cappedTotal / batchSize) : 0;

  return {
    estimatedTotal,
    riskLevel: risk.level,
    riskLabel: risk.label,
    canGenerate: risk.canGenerate && counts.geoNodes > 0 && counts.categories > 0 && counts.intents > 0,
    counts: { ...counts, pageTypeVariants },
    formula,
    warnings,
    limits: {
      maxPreview: config.maxPreview,
      maxGenerate: config.maxGenerate,
      generationLimit: config.generationLimit,
      batchSize,
    },
    generationPlan: { batches, batchSize, cappedTotal },
  };
}
