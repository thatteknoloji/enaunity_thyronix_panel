import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildFeedOutputUrls, planFeedChunks, parseFeedPartParam } from "@/lib/thyronix/feed-chunk";
import { loadMergedFeedProductsForOutput } from "@/lib/thyronix/feed-output-service";
import { applyFeedTransformSettings, loadFeedTransformSettings, type FeedProduct } from "@/lib/thyronix/feed-transform";
import { resolveFeedSourceIds } from "@/lib/thyronix/source-feed-provision";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const part = parseFeedPartParam(new URL(req.url).searchParams);

  try {
    const feed = await prisma.thyronixFeed.findUnique({ where: { id } });
    if (!feed) return NextResponse.json({ error: "Feed bulunamadı" }, { status: 404 });

    const sourceIds = await resolveFeedSourceIds(feed);
    const { products: merged, filterStats } = await loadMergedFeedProductsForOutput(feed, sourceIds);
    const transformSettings = await loadFeedTransformSettings(feed.dealerId);
    const transformed = applyFeedTransformSettings(merged as FeedProduct[], transformSettings);
    const plan = planFeedChunks(transformed.length);
    const partIndex = Math.min(Math.max(part, 1), Math.max(plan.partCount, 1)) - 1;
    const chunk = plan.parts[partIndex] || plan.parts[0];
    const slice = chunk ? transformed.slice(chunk.offset, chunk.offset + chunk.limit) : [];

    return NextResponse.json({
      feedId: id,
      feedName: feed.name,
      generatedAt: new Date().toISOString(),
      productCount: slice.length,
      totalProducts: plan.totalProducts,
      outputFilter: filterStats,
      part: chunk?.part || 1,
      totalParts: plan.partCount,
      maxPerFile: plan.maxPerFile,
      products: slice,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
