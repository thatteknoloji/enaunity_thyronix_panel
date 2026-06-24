import { prisma } from "@/lib/db";
import { mergeProducts, type MergeStrategy } from "./merge-engine";
import {
  FEED_MAX_PRODUCTS_PER_FILE,
  parseFeedPartParam,
  planFeedChunks,
  type FeedChunkPlan,
} from "./feed-chunk";

const DB_CHUNK = 2000;

type FeedRecord = {
  id: string;
  mergeStrategy: string;
  outputFormat: string;
  dealerId: string | null;
};

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
  const allProducts: Record<string, unknown>[] = [];
  let cursor: string | undefined;

  while (true) {
    const chunk = await prisma.thyronixProduct.findMany({
      where: {
        sourceId: { in: sourceIds },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      orderBy: { id: "asc" },
      take: DB_CHUNK,
    });
    if (chunk.length === 0) break;
    allProducts.push(...chunk);
    cursor = chunk[chunk.length - 1].id;
  }

  const strategy = (feed.mergeStrategy || "lowest_price") as MergeStrategy;
  return mergeProducts(
    allProducts as never[],
    strategy,
    strategy === "source_priority" ? sourceIds : []
  ) as Record<string, unknown>[];
}

export async function resolveFeedChunkSlice(
  feed: FeedRecord,
  sourceIds: string[],
  part: number
): Promise<{
  products: Record<string, unknown>[];
  plan: FeedChunkPlan;
  partMeta: { part: number; offset: number; limit: number };
}> {
  const merged = await loadMergedFeedProducts(feed, sourceIds);
  const plan = planFeedChunks(merged.length);
  const partIndex = Math.min(Math.max(part, 1), Math.max(plan.partCount, 1)) - 1;
  const chunk = plan.parts[partIndex] || { part: 1, offset: 0, limit: FEED_MAX_PRODUCTS_PER_FILE, productCount: 0, label: "Parça 1/1" };
  const products = merged.slice(chunk.offset, chunk.offset + chunk.limit);

  return {
    products,
    plan,
    partMeta: { part: chunk.part, offset: chunk.offset, limit: chunk.limit },
  };
}

export function feedOutputHeaders(plan: FeedChunkPlan, partMeta: { part: number; offset: number; limit: number }) {
  return {
    "X-Feed-Total-Products": String(plan.totalProducts),
    "X-Feed-Part": String(partMeta.part),
    "X-Feed-Total-Parts": String(plan.partCount),
    "X-Feed-Part-Products": String(partMeta.limit),
    "X-Feed-Max-Per-File": String(FEED_MAX_PRODUCTS_PER_FILE),
  };
}

export function parsePartFromRequest(req: Request): number {
  return parseFeedPartParam(new URL(req.url).searchParams);
}
