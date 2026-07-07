import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildFeedOutputUrls, FEED_MAX_PRODUCTS_PER_FILE, planFeedChunks } from "@/lib/thyronix/feed-chunk";
import { loadMergedFeedProductsForOutput } from "@/lib/thyronix/feed-output-service";
import { resolveFeedSourceIds } from "@/lib/thyronix/source-feed-provision";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const feed = await prisma.thyronixFeed.findUnique({ where: { id } });
    if (!feed) return NextResponse.json({ error: "Feed bulunamadı" }, { status: 404 });

    const sourceIds = await resolveFeedSourceIds(feed);
    const { products: merged, filterStats } = await loadMergedFeedProductsForOutput(feed, sourceIds);
    const plan = planFeedChunks(merged.length);
    const outputUrls = buildFeedOutputUrls(id, plan);

    return NextResponse.json({
      success: true,
      data: {
        feedId: id,
        feedName: feed.name,
        totalProducts: plan.totalProducts,
        mergedProductCount: merged.length,
        outputFilter: filterStats,
        maxPerFile: FEED_MAX_PRODUCTS_PER_FILE,
        partCount: plan.partCount,
        needsSplit: plan.needsSplit,
        summary: plan.summaryTr,
        parts: plan.parts,
        lastGeneratedAt: feed.lastPublished || null,
        supportedFormats: ["xml", "csv", "xlsx", "json"],
        outputUrls: outputUrls.default,
        outputParts: outputUrls.parts,
        warnings: plan.needsSplit
          ? [
              plan.summaryTr,
              `Her dosyada en fazla ${FEED_MAX_PRODUCTS_PER_FILE.toLocaleString("tr-TR")} ürün. Tüm parçaları indirmek için ?part=1, ?part=2 … kullanın.`,
            ]
          : [],
      },
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
