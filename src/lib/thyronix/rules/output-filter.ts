import type { ThyronixRulesBundle } from "./types";
import { passesQualityGate, resolveRulesForSource, shouldHideFromOutput } from "./resolver";

export type OutputExclusionReason = "stock" | "gate";

export type OutputFilterStats = {
  total: number;
  included: number;
  hiddenByStock: number;
  hiddenByGate: number;
  missingFromSource: number;
};

export type OutputFilterResult = {
  products: Record<string, unknown>[];
  stats: OutputFilterStats;
  excludedSample: Array<{
    name: string;
    reason: OutputExclusionReason;
    stock?: number;
  }>;
};

type OutputProduct = {
  sourceId?: string;
  name?: string;
  stock?: number;
  status?: string;
  image?: string | null;
  description?: string | null;
  barcode?: string | null;
  category?: string | null;
  vatRate?: number | null;
  variantData?: string | null;
};

export function shouldIncludeProductInOutput(
  product: OutputProduct,
  rules: ThyronixRulesBundle,
): { include: boolean; reason?: OutputExclusionReason } {
  if (product.status === "missing_from_source") {
    return { include: true };
  }
  if (!passesQualityGate(product, rules.gate)) {
    return { include: false, reason: "gate" };
  }
  const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
  if (shouldHideFromOutput(stock, rules.stock)) {
    return { include: false, reason: "stock" };
  }
  return { include: true };
}

export async function buildRulesMapForSources(sourceIds: string[]): Promise<Map<string, ThyronixRulesBundle>> {
  const unique = [...new Set(sourceIds.filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (sourceId) => [sourceId, await resolveRulesForSource(sourceId)] as const),
  );
  return new Map(entries);
}

export async function filterProductsForOutput(
  products: Record<string, unknown>[],
  rulesMap?: Map<string, ThyronixRulesBundle>,
): Promise<OutputFilterResult> {
  const sourceIds = products.map((p) => String(p.sourceId || ""));
  const map = rulesMap || (await buildRulesMapForSources(sourceIds));

  const included: Record<string, unknown>[] = [];
  const excludedSample: OutputFilterResult["excludedSample"] = [];
  const stats: OutputFilterStats = {
    total: products.length,
    included: 0,
    hiddenByStock: 0,
    hiddenByGate: 0,
    missingFromSource: 0,
  };

  for (const raw of products) {
    const product = raw as OutputProduct;
    if (product.status === "missing_from_source") stats.missingFromSource++;

    const sourceId = String(product.sourceId || "");
    const rules = map.get(sourceId) || (await resolveRulesForSource(sourceId));
    const decision = shouldIncludeProductInOutput(product, rules);

    if (decision.include) {
      included.push(raw);
      stats.included++;
      continue;
    }

    if (decision.reason === "stock") stats.hiddenByStock++;
    if (decision.reason === "gate") stats.hiddenByGate++;

    if (excludedSample.length < 12 && product.name) {
      excludedSample.push({
        name: String(product.name).slice(0, 80),
        reason: decision.reason!,
        stock: product.stock,
      });
    }
  }

  return { products: included, stats, excludedSample };
}
