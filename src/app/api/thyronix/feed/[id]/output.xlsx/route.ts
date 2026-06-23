import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";
import {
  feedOutputHeaders,
  loadActiveSourceIds,
  parsePartFromRequest,
  resolveFeedChunkSlice,
} from "@/lib/thyronix/feed-output-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const part = parsePartFromRequest(req);

  try {
    const feed = await prisma.thyronixFeed.findUnique({ where: { id } });
    if (!feed) return new Response("Feed bulunamadı", { status: 404 });

    const sourceIds = await loadActiveSourceIds({ dealerId: feed.dealerId });
    const { products, plan, partMeta } = await resolveFeedChunkSlice(feed, sourceIds, part);

    const headers = ["Ürün Adı", "Açıklama", "Marka", "Kategori", "Barkod", "Stok Kodu", "Model Kodu", "Fiyat", "Stok", "Para Birimi", "Durum", "Görseller"];
    const keys = ["name", "description", "brand", "category", "barcode", "stockCode", "modelCode", "price", "stock", "currency", "status", "images"];
    const rows = products.map((p) => keys.map((k) => p[k] ?? ""));
    const data = [headers, ...rows];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = headers.map((_, i) => ({ wch: i === 1 ? 40 : 20 }));
    XLSX.utils.book_append_sheet(wb, ws, `Parça ${partMeta.part}`);

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="thyronix-feed-${id}-part${partMeta.part}.xlsx"`,
        ...feedOutputHeaders(plan, partMeta),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    return new Response(msg, { status: 500 });
  }
}
