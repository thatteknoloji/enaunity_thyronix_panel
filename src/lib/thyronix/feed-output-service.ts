import { prisma } from "@/lib/db";
import { getProductKey, type MergeStrategy } from "./merge-engine";
import {
  FEED_MAX_PRODUCTS_PER_FILE,
  parseFeedPartParam,
  planFeedChunks,
  type FeedChunkPlan,
} from "./feed-chunk";
import { filterProductsForOutput } from "./rules/output-filter";

const DB_CHUNK = 2000;

type FeedRecord = {
  id: string;
  mergeStrategy: string;
  outputFormat: string;
  dealerId: string | null;
};

type LeanFeedProduct = {
  id: string;
  sourceId: string;
  externalId: string;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  stockCode: string | null;
  modelCode: string | null;
  price: number;
  discountedPrice: number | null;
  costPrice: number | null;
  stock: number;
  currency: string;
  image: string | null;
  images: string | null;
  weight: number | null;
  dimensions: string | null;
  vatRate: number | null;
  deliveryTime: string | null;
  manufacturer: string | null;
  warranty: string | null;
  shippingCost: number | null;
  productUrl: string | null;
  variantData: string | null;
  metadataJson: string;
  status: string;
};

type MergeBucket = {
  winner: LeanFeedProduct;
  sourceIds: string[];
};

function deliveryToScore(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function isBetterCandidate(
  candidate: LeanFeedProduct,
  winner: LeanFeedProduct,
  strategy: MergeStrategy,
  priorityMap: Map<string, number>
): boolean {
  switch (strategy) {
    case "lowest_price":
      return candidate.price < winner.price;
    case "highest_stock":
      return candidate.stock > winner.stock;
    case "shortest_delivery":
      return deliveryToScore((candidate as { deliveryTime?: string | null }).deliveryTime) <
        deliveryToScore((winner as { deliveryTime?: string | null }).deliveryTime);
    case "source_priority": {
      const candidatePriority = priorityMap.get(candidate.sourceId || "") ?? Number.MAX_SAFE_INTEGER;
      const winnerPriority = priorityMap.get(winner.sourceId || "") ?? Number.MAX_SAFE_INTEGER;
      return candidatePriority < winnerPriority;
    }
    default:
      return candidate.price < winner.price;
  }
}

export async function countActiveSourceProducts(sourceIds: string[]): Promise<number> {
  if (!sourceIds.length) return 0;
  return prisma.thyronixProduct.count({
    where: { sourceId: { in: sourceIds } },
  });
}

export async function loadActiveSourceIds(opts?: { dealerId?: string | null }): Promise<string[]> {
  const sources = await prisma.thyronixSource.findMany({
    where: {
      status: "active",
      ...(opts?.dealerId ? { dealerId: opts.dealerId } : {}),
    },
    select: { id: true },
  });
  return sources.map((s) => s.id);
}

/** Tüm kaynakları birleştirip merge stratejisi uygular */
export async function loadMergedFeedProducts(
  feed: FeedRecord,
  sourceIds: string[]
): Promise<Record<string, unknown>[]> {
  const buckets = new Map<string, MergeBucket>();
  const priorityMap = new Map(
    (sourceIds || []).map((id, index) => [id, index] as const)
  );
  let cursor: string | undefined;

  while (true) {
    const chunk = await prisma.thyronixProduct.findMany({
      where: {
        sourceId: { in: sourceIds },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: {
        id: true,
        sourceId: true,
        externalId: true,
        name: true,
        description: true,
        brand: true,
        category: true,
        barcode: true,
        stockCode: true,
        modelCode: true,
        price: true,
        discountedPrice: true,
        costPrice: true,
        stock: true,
        currency: true,
        image: true,
        images: true,
        weight: true,
        dimensions: true,
        vatRate: true,
        deliveryTime: true,
        manufacturer: true,
        warranty: true,
        shippingCost: true,
        productUrl: true,
        variantData: true,
        metadataJson: true,
        status: true,
      },
      orderBy: { id: "asc" },
      take: DB_CHUNK,
    });
    if (chunk.length === 0) break;

    for (const raw of chunk as LeanFeedProduct[]) {
      const key = getProductKey({
        id: raw.id,
        name: raw.name,
        barcode: raw.barcode,
        stockCode: raw.stockCode,
        price: raw.price,
        stock: raw.stock,
        sourceId: raw.sourceId,
      });
      const bucket = buckets.get(key);
      if (!bucket) {
        buckets.set(key, {
          winner: { ...raw },
          sourceIds: [raw.sourceId || raw.id],
        });
        continue;
      }

      bucket.sourceIds.push(raw.sourceId || raw.id);
      if (isBetterCandidate(raw, bucket.winner, feed.mergeStrategy as MergeStrategy, priorityMap)) {
        bucket.winner = { ...raw };
      }
    }

    cursor = chunk[chunk.length - 1].id;
  }

  for (const bucket of buckets.values()) {
    (bucket.winner as Record<string, unknown>).mergeSourceIds = JSON.stringify(bucket.sourceIds);
  }

  return [...buckets.values()].map((bucket) => bucket.winner as Record<string, unknown>);
}

/** Çıktı XML/CSV/JSON — stok ve kalite kurallarını uygular (DB'ye dokunmaz). */
export async function loadMergedFeedProductsForOutput(
  feed: FeedRecord,
  sourceIds: string[],
): Promise<{
  products: Record<string, unknown>[];
  filterStats: Awaited<ReturnType<typeof filterProductsForOutput>>["stats"];
}> {
  const merged = await loadMergedFeedProducts(feed, sourceIds);
  const filtered = await filterProductsForOutput(merged);
  return { products: filtered.products, filterStats: filtered.stats };
}

export async function resolveFeedChunkSlice(
  feed: FeedRecord,
  sourceIds: string[],
  part: number
): Promise<{
  products: Record<string, unknown>[];
  plan: FeedChunkPlan;
  partMeta: { part: number; offset: number; limit: number; productCount: number };
  filterStats: Awaited<ReturnType<typeof filterProductsForOutput>>["stats"];
}> {
  const { products: merged, filterStats } = await loadMergedFeedProductsForOutput(feed, sourceIds);
  const plan = planFeedChunks(merged.length);
  const partIndex = Math.min(Math.max(part, 1), Math.max(plan.partCount, 1)) - 1;
  const chunk = plan.parts[partIndex] || { part: 1, offset: 0, limit: FEED_MAX_PRODUCTS_PER_FILE, productCount: 0, label: "Parça 1/1" };
  const products = merged.slice(chunk.offset, chunk.offset + chunk.limit);

  return {
    products,
    plan,
    partMeta: { part: chunk.part, offset: chunk.offset, limit: chunk.limit, productCount: products.length },
    filterStats,
  };
}

export function feedOutputHeaders(plan: FeedChunkPlan, partMeta: { part: number; offset: number; limit: number; productCount?: number }) {
  return {
    "X-Feed-Total-Products": String(plan.totalProducts),
    "X-Feed-Part": String(partMeta.part),
    "X-Feed-Total-Parts": String(plan.partCount),
    "X-Feed-Part-Products": String(partMeta.productCount ?? partMeta.limit),
    "X-Feed-Max-Per-File": String(FEED_MAX_PRODUCTS_PER_FILE),
  };
}

export function parsePartFromRequest(req: Request): number {
  return parseFeedPartParam(new URL(req.url).searchParams);
}
