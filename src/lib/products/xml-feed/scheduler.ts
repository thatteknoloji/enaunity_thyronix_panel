import { prisma } from "@/lib/db";
import { runXmlFeedSync } from "./sync-runner";

export async function syncDueXmlFeeds(options: { now?: Date; limit?: number } = {}) {
  const now = options.now ?? new Date();
  const limit = Math.max(1, Math.min(options.limit ?? 3, 10));

  const feeds = await prisma.productXmlFeed.findMany({
    where: {
      status: { in: ["ACTIVE", "ERROR"] },
      OR: [{ nextSyncAt: null }, { nextSyncAt: { lte: now } }],
    },
    orderBy: [{ nextSyncAt: "asc" }, { lastSyncAt: "asc" }],
    take: limit,
  });

  const results: Array<{
    feedId: string;
    feedName: string;
    status: string;
    added: number;
    updated: number;
    skipped: number;
    errors: string[];
    durationMs: number;
  }> = [];

  for (const feed of feeds) {
    const report = await runXmlFeedSync(feed.id);
    results.push({
      feedId: feed.id,
      feedName: feed.name,
      status: report.status,
      added: report.added,
      updated: report.updated,
      skipped: report.skipped,
      errors: report.errors.slice(0, 5),
      durationMs: report.durationMs,
    });
  }

  return { checked: feeds.length, results };
}
