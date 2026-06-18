import { prisma } from "@/lib/db";
import { mergeProducts } from "@/lib/thyronix/merge-engine";
import type { MergeStrategy } from "@/lib/thyronix/merge-engine";

export const dynamic = "force-dynamic";

function escapeCsv(val: any): string {
  const s = String(val ?? "").replace(/"/g, '""');
  return /[",;\n\r]/.test(s) ? `"${s}"` : s;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const feed = await prisma.thyronixFeed.findUnique({ where: { id } });
    if (!feed) return new Response("Feed bulunamadı", { status: 404 });

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

    const headers = ["name", "description", "brand", "category", "barcode", "stockCode", "modelCode", "price", "stock", "currency", "status", "images"];
    const BOM = "\uFEFF";
    const csv = BOM + [
      headers.join(","),
      ...merged.map(p => headers.map(h => escapeCsv((p as any)[h] ?? "")).join(",")),
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="thyronix-feed-${id}.csv"`,
      },
    });
  } catch (e: any) {
    return new Response(e.message || "Sunucu hatası", { status: 500 });
  }
}
