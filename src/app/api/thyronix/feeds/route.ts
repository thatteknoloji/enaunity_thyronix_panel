import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertCanAccessFeed,
  requireThyronixDealerOrAdmin,
  tenantOwnerFields,
  thyronixErrorResponse,
} from "@/lib/thyronix/access";
import { checkPlanLimit } from "@/lib/thyronix/workspace";
import { resolveDealerId } from "@/lib/thyronix/workspace";
import { normalizeTemplateId } from "@/lib/thyronix/templates";
import { FEED_REFRESH_INTERVALS } from "@/lib/thyronix/commercial";
import { buildFeedOutputUrls, planFeedChunks } from "@/lib/thyronix/feed-chunk";
import { loadMergedFeedProductsForOutput } from "@/lib/thyronix/feed-output-service";
import { resolveFeedSourceIds } from "@/lib/thyronix/source-feed-provision";

function normalizeSchedule(value: unknown): 4 | 6 | 12 | 24 {
  const n = Number(value);
  return (FEED_REFRESH_INTERVALS.includes(n as 4 | 6 | 12 | 24) ? n : 24) as 4 | 6 | 12 | 24;
}

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const feedOwnerFilter = user.role === "admin" ? {} : { dealerId: user.dealerId };
    const feeds = await prisma.thyronixFeed.findMany({
      where: { sourceId: null, ...feedOwnerFilter },
      include: { source: { select: { name: true, type: true } } },
      orderBy: { createdAt: "desc" },
    });
    const data = await Promise.all(feeds.map(async (feed) => {
      try {
        const sourceIds = await resolveFeedSourceIds(feed as any);
        const { products: merged, filterStats } = await loadMergedFeedProductsForOutput(feed as any, sourceIds);
        const chunkPlan = planFeedChunks(merged.length);
        const outputUrls = buildFeedOutputUrls(feed.id, chunkPlan);
        return {
          ...feed,
          liveProductCount: merged.length,
          outputFilter: filterStats,
          countMismatch: merged.length !== feed.productCount,
          chunkPlan,
          outputUrls: outputUrls.default,
          outputParts: outputUrls.parts,
        };
      } catch (error) {
        return {
          ...feed,
          liveProductCount: feed.productCount,
          countMismatch: false,
          chunkPlan: planFeedChunks(feed.productCount || 0),
          outputUrls: buildFeedOutputUrls(feed.id, planFeedChunks(feed.productCount || 0)).default,
          outputParts: buildFeedOutputUrls(feed.id, planFeedChunks(feed.productCount || 0)).parts,
          liveError: error instanceof Error ? error.message : "Feed sayısı hesaplanamadı",
        };
      }
    }));
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
    const feedOwnerFilter = user.role === "admin" ? {} : { dealerId: user.dealerId };
    const count = await prisma.thyronixFeed.count({ where: { sourceId: null, ...feedOwnerFilter } });
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
