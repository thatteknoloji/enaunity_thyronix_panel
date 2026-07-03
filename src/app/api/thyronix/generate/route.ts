import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertCanAccessFeed,
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
} from "@/lib/thyronix/access";
import { buildFeedOutputUrls } from "@/lib/thyronix/feed-chunk";
import { warmFeedXmlCache } from "@/lib/thyronix/feed-cache-warm";

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const feedId = body.feedId || body.id;
    if (!feedId) return NextResponse.json({ success: false, error: "Feed ID gerekli" }, { status: 400 });

    await assertCanAccessFeed(user, feedId);
    const feed = await prisma.thyronixFeed.findUnique({ where: { id: feedId } });
    if (!feed) return NextResponse.json({ success: false, error: "Feed bulunamadı" }, { status: 404 });

    const startTime = Date.now();
    const warmed = await warmFeedXmlCache(feed.id);
    const totalProducts = warmed.productCount;
    const chunkPlan = warmed.plan;
    const outputUrls = buildFeedOutputUrls(feedId, chunkPlan);

    const duration = Date.now() - startTime;
    await prisma.thyronixSyncLog.create({
      data: {
        type: "feed",
        referenceId: feedId,
        status: totalProducts > 0 ? "success" : "warning",
        message: chunkPlan.needsSplit
          ? `${totalProducts} ürün — ${chunkPlan.partCount} parçaya bölündü`
          : `${totalProducts} ürün ile feed oluşturuldu`,
        productCount: totalProducts,
        duration,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        productCount: totalProducts,
        duration,
        chunkPlan,
        outputUrls: outputUrls.default,
        outputParts: outputUrls.parts,
        url: outputUrls.default.xml,
        summary: chunkPlan.summaryTr,
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
