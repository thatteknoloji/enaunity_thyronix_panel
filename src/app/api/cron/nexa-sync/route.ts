import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSourceFeedsForSources, resolveFeedSourceIds } from "@/lib/thyronix/source-feed-provision";
import { loadMergedFeedProducts } from "@/lib/thyronix/feed-output-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Basic auth via query param secret
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const sources = await prisma.thyronixSource.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        inputFormat: true,
        status: true,
        productCount: true,
        lastSync: true,
        dealerId: true,
        tenantScope: true,
        ownerType: true,
      },
    });
    await ensureSourceFeedsForSources(sources.map((source) => ({ ...source, lastSync: source.lastSync || null })));

    const feeds = await prisma.thyronixFeed.findMany({ where: { status: "active" } });
    const results: Array<{ feedId: string; products: number; duration: number; error?: string }> = [];

    for (const feed of feeds) {
      const scheduleHours = (feed as any).schedule || 24;
      const lastPublished = (feed as any).lastPublished;
      const nextRun = lastPublished
        ? new Date(lastPublished.getTime() + scheduleHours * 60 * 60 * 1000)
        : new Date(0);

      if (nextRun > now) continue; // Skip if not due yet

      const start = Date.now();
      try {
        const sourceIds = await resolveFeedSourceIds(feed as any);
        const merged = await loadMergedFeedProducts(feed as any, sourceIds);
        const totalProducts = merged.length;

        await prisma.thyronixFeed.update({
          where: { id: feed.id },
          data: { productCount: totalProducts, lastPublished: now } as any,
        });

        await prisma.thyronixSyncLog.create({
          data: {
            type: "sync",
            referenceId: feed.id,
            status: "success",
            message: `Zamanlanmış feed güncellemesi: ${totalProducts} ürün`,
            productCount: totalProducts,
            duration: Date.now() - start,
          },
        });

        results.push({ feedId: feed.id, products: totalProducts, duration: Date.now() - start });
      } catch (e) {
        await prisma.thyronixSyncLog.create({
          data: {
            type: "sync",
            referenceId: feed.id,
            status: "error",
            message: `Zamanlanmış feed hatası: ${(e as Error).message}`,
            duration: Date.now() - start,
          },
        });
        results.push({ feedId: feed.id, products: 0, duration: Date.now() - start, error: (e as Error).message });
      }
    }

    return NextResponse.json({ success: true, data: { feedsChecked: feeds.length, results } });
  } catch (e) {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
