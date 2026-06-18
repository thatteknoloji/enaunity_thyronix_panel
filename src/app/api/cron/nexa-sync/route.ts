import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mergeProducts } from "@/lib/thyronix/merge-engine";
import type { MergeStrategy } from "@/lib/thyronix/merge-engine";

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
        const sources = await prisma.thyronixSource.findMany({ where: { status: "active" } });
        let totalProducts = 0;

        for (const source of sources) {
          const products = await prisma.thyronixProduct.findMany({ where: { sourceId: source.id, status: "active" } });
          const strategy = ((feed as any).mergeStrategy || "lowest_price") as MergeStrategy;
          const merged = mergeProducts(products as any, strategy, strategy === "source_priority" ? sources.map(s => s.id) : []);
          totalProducts += merged.length;
        }

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
