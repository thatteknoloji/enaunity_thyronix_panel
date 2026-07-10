import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireThyronixDealerOrAdmin,
  tenantOwnerFields,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";
import { checkPlanLimit } from "@/lib/thyronix/workspace";
import { resolveDealerId } from "@/lib/thyronix/workspace";
import { normalizeTemplateId } from "@/lib/thyronix/templates";
import { FEED_REFRESH_INTERVALS } from "@/lib/thyronix/commercial";
import { buildFeedOutputUrls, planFeedChunks } from "@/lib/thyronix/feed-chunk";
import { resolveFeedSourceIds } from "@/lib/thyronix/source-feed-provision";

function normalizeSchedule(value: unknown): 4 | 6 | 12 | 24 {
  const n = Number(value);
  return (FEED_REFRESH_INTERVALS.includes(n as 4 | 6 | 12 | 24) ? n : 24) as 4 | 6 | 12 | 24;
}

export async function GET(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const live = new URL(req.url).searchParams.get("live") === "1";
    const feeds = await prisma.thyronixFeed.findMany({
      where: withTenantFilter(user, {}),
      include: { source: { select: { name: true, type: true } } },
      orderBy: [{ sourceId: "asc" }, { createdAt: "desc" }],
    });

    const enrichFeed = async (feed: (typeof feeds)[number]) => {
      const storedCount = feed.productCount || 0;
      const chunkPlan = planFeedChunks(storedCount);
      const outputUrls = buildFeedOutputUrls(feed.id, chunkPlan);
      const base = {
        ...feed,
        feedKind: feed.sourceId ? "source" as const : "combined" as const,
        liveProductCount: storedCount,
        countMismatch: false,
        chunkPlan,
        outputUrls: outputUrls.default,
        outputParts: outputUrls.parts,
      };

      if (!live) return base;

      try {
        const { loadMergedFeedProductsForOutput } = await import("@/lib/thyronix/feed-output-service");
        const sourceIds = await resolveFeedSourceIds(feed as any);
        const { products: merged, filterStats } = await loadMergedFeedProductsForOutput(feed as any, sourceIds);
        const liveChunkPlan = planFeedChunks(merged.length);
        const liveOutputUrls = buildFeedOutputUrls(feed.id, liveChunkPlan);
        return {
          ...base,
          liveProductCount: merged.length,
          outputFilter: filterStats,
          countMismatch: merged.length !== feed.productCount,
          chunkPlan: liveChunkPlan,
          outputUrls: liveOutputUrls.default,
          outputParts: liveOutputUrls.parts,
        };
      } catch (error) {
        return {
          ...base,
          liveError: error instanceof Error ? error.message : "Feed sayısı hesaplanamadı",
        };
      }
    };

    const data = await Promise.all(feeds.map(enrichFeed));
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const owner = tenantOwnerFields(user);
    const dealerId = await resolveDealerId(user);
    const count = await prisma.thyronixFeed.count({
      where: withTenantFilter(user, { sourceId: null }),
    });
    const limitCheck = await checkPlanLimit(dealerId, "feeds", count);
    if (!limitCheck.ok) {
      return NextResponse.json(
        { success: false, error: `Paket limiti: en fazla ${limitCheck.limit} feed (${limitCheck.planKey})` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const feed = await prisma.thyronixFeed.create({
      data: {
        name: body.name,
        channel: body.channel || "custom",
        url: body.url || null,
        interval: body.interval || 60,
        outputFormat: normalizeTemplateId(body.outputFormat || "jetteknoloji"),
        mergeStrategy: body.mergeStrategy || "lowest_price",
        schedule: normalizeSchedule(body.schedule),
        status: body.status || "active",
        sourceId: body.sourceId || null,
        dealerId: owner.dealerId,
        tenantScope: owner.tenantScope,
        ownerType: owner.ownerType,
      },
    });
    return NextResponse.json({ success: true, data: feed }, { status: 201 });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
