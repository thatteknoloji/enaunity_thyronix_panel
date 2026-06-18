import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mergeProducts } from "@/lib/thyronix/merge-engine";
import type { MergeStrategy } from "@/lib/thyronix/merge-engine";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const feed = await prisma.thyronixFeed.findUnique({ where: { id } });
    if (!feed) return NextResponse.json({ error: "Feed bulunamadı" }, { status: 404 });

    const sources = await prisma.thyronixSource.findMany({ where: { status: "active" } });
    const CHUNK = 2000;
    const sourceIds = sources.map(s => s.id);
    const allProducts: any[] = [];
    let cursor: string | undefined;

    while (true) {
      const chunk = await prisma.thyronixProduct.findMany({
        where: { sourceId: { in: sourceIds }, ...(cursor ? { id: { gt: cursor } } : {}) },
        orderBy: { id: "asc" },
        take: CHUNK,
      });
      if (chunk.length === 0) break;
      allProducts.push(...chunk);
      cursor = chunk[chunk.length - 1].id;
    }

    const strategy = ((feed as any).mergeStrategy || "lowest_price") as MergeStrategy;
    const merged = mergeProducts(allProducts as any, strategy, strategy === "source_priority" ? sourceIds : []);

    return NextResponse.json({
      feedId: id,
      feedName: feed.name,
      generatedAt: new Date().toISOString(),
      productCount: merged.length,
      products: merged.map(p => ({
        name: (p as any).name,
        description: (p as any).description || null,
        brand: (p as any).brand || null,
        category: (p as any).category || null,
        barcode: (p as any).barcode || null,
        stockCode: (p as any).stockCode || null,
        modelCode: (p as any).modelCode || null,
        price: (p as any).price || 0,
        stock: (p as any).stock || 0,
        currency: (p as any).currency || "TRY",
        status: (p as any).status || "active",
        images: (p as any).images || null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}
