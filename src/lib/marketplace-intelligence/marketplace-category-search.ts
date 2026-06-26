import type { CategorySearchResult, MarketplaceId } from "./marketplace-types";
import {
  MARKETPLACE_CATEGORY_CACHE,
  getMarketplaceLabel,
} from "./marketplace-category-cache";
import { listCommissionEntries } from "./marketplace-commission-cache";

function normalize(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .trim();
}

function scoreTerm(query: string, candidate: string): number {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (c === q) return 100;
  if (c.startsWith(q)) return 85;
  if (c.includes(q)) return 70;
  const qTokens = q.split(/\s+/).filter(Boolean);
  const matched = qTokens.filter((t) => c.includes(t)).length;
  if (matched > 0) return 40 + matched * 15;
  return 0;
}

export function searchMarketplaceCategories(
  query: string,
  options?: { marketplace?: MarketplaceId; limit?: number },
): CategorySearchResult[] {
  const limit = options?.limit ?? 12;
  const q = query.trim();
  if (q.length < 2) return [];

  const results: CategorySearchResult[] = [];
  const seen = new Set<string>();

  for (const node of MARKETPLACE_CATEGORY_CACHE) {
    if (options?.marketplace && node.marketplace !== options.marketplace) continue;

    const scores = [
      scoreTerm(q, node.name),
      scoreTerm(q, node.path),
      ...node.searchTerms.map((term) => scoreTerm(q, term)),
    ];
    const score = Math.max(...scores);
    if (score < 40) continue;

    results.push({
      categoryId: node.id,
      marketplace: node.marketplace,
      marketplaceLabel: getMarketplaceLabel(node.marketplace),
      name: node.name,
      path: node.path,
      enaSlug: node.enaSlug,
      score,
    });
    seen.add(node.id);
  }

  for (const entry of listCommissionEntries(options?.marketplace)) {
    const path = `${entry.mainCategory} > ${entry.subCategory}`;
    const name = entry.subCategory;
    const scores = [
      scoreTerm(q, name),
      scoreTerm(q, path),
      scoreTerm(q, entry.productGroup),
      scoreTerm(q, entry.mainCategory),
    ];
    const score = Math.max(...scores);
    if (score < 40) continue;

    const syntheticId = entry.categoryId;
    if (seen.has(syntheticId)) continue;
    seen.add(syntheticId);

    results.push({
      categoryId: syntheticId,
      marketplace: entry.marketplace,
      marketplaceLabel: getMarketplaceLabel(entry.marketplace),
      name: entry.subCategory,
      path: entry.productGroup ? `${path} > ${entry.productGroup}` : path,
      enaSlug: "genel",
      score: score - 5,
      ratePercent: entry.ratePercent,
      confidence: entry.source.confidence,
    });
  }

  return results
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "tr"))
    .slice(0, limit);
}

export function suggestCategoriesForEnaText(
  rawCategory: string | null | undefined,
  marketplace?: MarketplaceId,
): CategorySearchResult[] {
  const q = (rawCategory || "").trim();
  if (!q) return [];
  return searchMarketplaceCategories(q, { marketplace, limit: 8 });
}
