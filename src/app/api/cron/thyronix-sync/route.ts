import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveFeedSourceIds } from "@/lib/thyronix/source-feed-provision";
import { loadMergedFeedProducts } from "@/lib/thyronix/feed-output-service";
import { syncDueThyronixSources } from "@/lib/thyronix/source-sync-runner";

export const dynamic = "force-dynamic";

async function refreshDueFeeds(now: Date) {
  const feeds = await prisma.thyronixFeed.findMany({ where: { status: "active", sourceId: null } });
  const results: Array<{ feedId: string; feedName: string; products: number; duration: number; error?: string }> = [];

  for (const feed of feeds) {
    const scheduleHours = Math.max(12, Number((feed as any).schedule || 12) || 12);
    const lastPublished = (feed as any).lastPublished as Date | null;
    const nextRun = lastPublished
      ? new Date(lastPublished.getTime() + scheduleHours * 60 * 60 * 1000)
      : new Date(0);

    if (nextRun > now) continue;

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
          type: "feed-refresh",
          referenceId: feed.id,
          status: "success",
          message: `Zamanlanmış feed güncellemesi: ${totalProducts} ürün`,
          productCount: totalProducts,
          duration: Date.now() - start,
        },
      });

      results.push({ feedId: feed.id, feedName: feed.name, products: totalProducts, duration: Date.now() - start });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Feed güncelleme hatası";
      await prisma.thyronixSyncLog.create({
        data: {
          type: "feed-refresh",
          referenceId: feed.id,
          status: "error",
          message: `Zamanlanmış feed hatası: ${message}`,
          duration: Date.now() - start,
        },
      });
      results.push({ feedId: feed.id, feedName: feed.name, products: 0, duration: Date.now() - start, error: message });
    }
  }

  return { checked: feeds.length, results };
}

export async function GET(req: Request) {
  try {
    const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const sourceSync = await syncDueThyronixSources({ now, limit: 10 });
    const feedRefresh = await refreshDueFeeds(now);

    return NextResponse.json({
      success: true,
      data: {
        schedule: "12 saat",
        sources: sourceSync,
        feeds: feedRefresh,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "THYRONIX cron hatası" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
