import { prisma } from "@/lib/db";
import { mergeProducts } from "@/lib/thyronix/merge-engine";
import type { MergeStrategy } from "@/lib/thyronix/merge-engine";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

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

    const headers = ["Ürün Adı", "Açıklama", "Marka", "Kategori", "Barkod", "Stok Kodu", "Model Kodu", "Fiyat", "Stok", "Para Birimi", "Durum", "Görseller"];
    const keys = ["name", "description", "brand", "category", "barcode", "stockCode", "modelCode", "price", "stock", "currency", "status", "images"];

    const rows = merged.map(p => keys.map(k => (p as any)[k] ?? ""));
    const data = [headers, ...rows];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = headers.map((_, i) => ({ wch: i === 1 ? 40 : 20 }));
    XLSX.utils.book_append_sheet(wb, ws, "Ürünler");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="thyronix-feed-${id}.xlsx"`,
      },
    });
  } catch (e: any) {
    return new Response(e.message || "Sunucu hatası", { status: 500 });
  }
}
