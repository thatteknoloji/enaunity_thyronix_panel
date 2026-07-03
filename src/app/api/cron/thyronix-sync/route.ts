import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveFeedSourceIds } from "@/lib/thyronix/source-feed-provision";
import { loadMergedFeedProducts } from "@/lib/thyronix/feed-output-service";
import { syncDueThyronixSources } from "@/lib/thyronix/source-sync-runner";

export const dynamic = "force-dynamic";

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

async function refreshDueFeeds(now: Date, limit: number) {
  const feeds = await prisma.thyronixFeed.findMany({
    where: { status: "active", sourceId: null },
    orderBy: [{ lastPublished: "asc" }, { createdAt: "asc" }],
  });
  const results: Array<{ feedId: string; feedName: string; products: number; duration: number; error?: string }> = [];

  for (const feed of feeds) {
    if (results.length >= limit) break;
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
    const url = new URL(req.url);
    const secret = req.headers.get("x-cron-secret") || url.searchParams.get("secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const sourceLimit = clampInt(url.searchParams.get("sourceLimit"), 2, 1, 5);
    const feedLimit = clampInt(url.searchParams.get("feedLimit"), 1, 0, 3);
    const fetchTimeoutMs = clampInt(url.searchParams.get("fetchTimeoutMs"), 60000, 10000, 180000);
    const now = new Date();
    const sourceSync = await syncDueThyronixSources({
      now,
      limit: sourceLimit,
      fetchTimeoutMs,
      refreshFeedTotals: false,
      snapshot: false,
    });
    const feedRefresh = await refreshDueFeeds(now, feedLimit);

    return NextResponse.json({
      success: true,
      data: {
        schedule: "12 saat",
        limits: { sourceLimit, feedLimit, fetchTimeoutMs },
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
