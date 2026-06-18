import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertCanAccessFeed,
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";
import { mergeProducts } from "@/lib/thyronix/merge-engine";
import type { MergeStrategy } from "@/lib/thyronix/merge-engine";

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
    const sources = await prisma.thyronixSource.findMany({
      where: withTenantFilter(user, { status: "active" }),
    });
    let totalProducts = 0;

    for (const source of sources) {
      const products = await prisma.thyronixProduct.findMany({
        where: withTenantFilter(user, { sourceId: source.id, status: "active" }),
      });
      const strategy = ((feed as any).mergeStrategy || "lowest_price") as MergeStrategy;
      const sourceIdList = sources.map((s) => s.id);
      const merged = mergeProducts(
        products as any,
        strategy,
        strategy === "source_priority" ? sourceIdList : [],
      );
      totalProducts += merged.length;
    }

    const duration = Date.now() - startTime;
    await prisma.thyronixFeed.update({
      where: { id: feedId },
      data: { productCount: totalProducts, lastPublished: new Date() } as any,
    });
    await prisma.thyronixSyncLog.create({
      data: {
        type: "feed",
        referenceId: feedId,
        status: totalProducts > 0 ? "success" : "warning",
        message: `${totalProducts} ürün ile feed oluşturuldu`,
        productCount: totalProducts,
        duration,
      },
    });

    return NextResponse.json({
      success: true,
      data: { productCount: totalProducts, duration, url: `/api/thyronix/feed/${feedId}/output.xml` },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
