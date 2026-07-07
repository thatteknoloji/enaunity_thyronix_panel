import type { MergeSourceProductsResult } from "../product-merge";

export type ThyronixSyncDiffDetails = {
  sourceId: string;
  sourceName: string;
  created: number;
  updated: number;
  unchanged: number;
  missingFromSource: number;
  priceChanged: number;
  stockChanged: number;
  samples: MergeSourceProductsResult["diff"];
};

export function buildSyncDiffDetails(
  sourceId: string,
  sourceName: string,
  merge: MergeSourceProductsResult,
): ThyronixSyncDiffDetails {
  return {
    sourceId,
    sourceName,
    created: merge.created,
    updated: merge.updated,
    unchanged: merge.unchanged,
    missingFromSource: merge.missingFromSource,
    priceChanged: merge.priceChanged,
    stockChanged: merge.stockChanged,
    samples: merge.diff,
  };
}

export function summarizeSyncDiff(details: ThyronixSyncDiffDetails): string {
  const parts = [
    `${details.created} yeni`,
    `${details.updated} güncelleme`,
    details.unchanged ? `${details.unchanged} değişmedi` : null,
    details.missingFromSource ? `${details.missingFromSource} kaynakta yok` : null,
    details.priceChanged ? `${details.priceChanged} fiyat değişti` : null,
    details.stockChanged ? `${details.stockChanged} stok değişti` : null,
  ].filter(Boolean);
  return parts.join(", ");
}
