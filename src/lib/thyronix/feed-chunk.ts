/** Thyronix feed çıktısı — dosya başına üst sınır */
export const FEED_MAX_PRODUCTS_PER_FILE = 50_000;

export type FeedChunkPart = {
  part: number;
  offset: number;
  limit: number;
  productCount: number;
  label: string;
};

export type FeedChunkPlan = {
  totalProducts: number;
  maxPerFile: number;
  partCount: number;
  needsSplit: boolean;
  parts: FeedChunkPart[];
  summaryTr: string;
};

export function planFeedChunks(totalProducts: number, maxPerFile = FEED_MAX_PRODUCTS_PER_FILE): FeedChunkPlan {
  const safeTotal = Math.max(0, totalProducts);
  const partCount = safeTotal === 0 ? 0 : Math.ceil(safeTotal / maxPerFile);
  const parts: FeedChunkPart[] = [];

  for (let part = 1; part <= partCount; part++) {
    const offset = (part - 1) * maxPerFile;
    const limit = Math.min(maxPerFile, safeTotal - offset);
    parts.push({
      part,
      offset,
      limit,
      productCount: limit,
      label: `Parça ${part}/${partCount}`,
    });
  }

  const needsSplit = partCount > 1;
  const summaryTr =
    safeTotal === 0
      ? "Ürün bulunamadı — feed oluşturulamaz."
      : needsSplit
        ? `${safeTotal.toLocaleString("tr-TR")} ürün ${partCount} feed parçasına bölünecek (parça başına en fazla ${maxPerFile.toLocaleString("tr-TR")} ürün).`
        : `${safeTotal.toLocaleString("tr-TR")} ürün tek feed dosyasında yayınlanacak.`;

  return {
    totalProducts: safeTotal,
    maxPerFile,
    partCount,
    needsSplit,
    parts,
    summaryTr,
  };
}

export function parseFeedPartParam(searchParams: URLSearchParams): number {
  const raw = searchParams.get("part") || searchParams.get("p") || "1";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function buildFeedOutputUrls(feedId: string, plan: FeedChunkPlan, formats: string[] = ["xml", "csv", "xlsx", "json"]) {
  const base = `/api/thyronix/feed/${feedId}`;
  if (plan.partCount <= 1) {
    const single: Record<string, string> = {};
    for (const fmt of formats) {
      single[fmt] = `${base}/output.${fmt}`;
    }
    return { default: single, parts: [{ part: 1, urls: single }] };
  }

  const parts = plan.parts.map((p) => {
    const urls: Record<string, string> = {};
    for (const fmt of formats) {
      urls[fmt] = `${base}/output.${fmt}?part=${p.part}`;
    }
    return { part: p.part, productCount: p.productCount, label: p.label, urls };
  });

  const defaultUrls: Record<string, string> = {};
  for (const fmt of formats) {
    defaultUrls[fmt] = `${base}/output.${fmt}?part=1`;
  }

  return { default: defaultUrls, parts };
}
