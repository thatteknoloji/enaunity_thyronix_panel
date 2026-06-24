import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";
import {
  feedOutputHeaders,
  parsePartFromRequest,
  resolveFeedChunkSlice,
} from "@/lib/thyronix/feed-output-service";
import { applyFeedTransformSettings, loadFeedTransformSettings, type FeedProduct } from "@/lib/thyronix/feed-transform";
import { resolveFeedSourceIds } from "@/lib/thyronix/source-feed-provision";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const part = parsePartFromRequest(req);

  try {
    const feed = await prisma.thyronixFeed.findUnique({ where: { id } });
    if (!feed) return new Response("Feed bulunamadı", { status: 404 });

    const sourceIds = await resolveFeedSourceIds(feed);
    const { products, plan, partMeta } = await resolveFeedChunkSlice(feed, sourceIds, part);
    const transformSettings = await loadFeedTransformSettings(feed.dealerId);
    const transformedProducts = applyFeedTransformSettings(products as FeedProduct[], transformSettings);

    const headers = ["ID", "Kaynak ID", "Harici ID", "Ürün Adı", "Açıklama", "Marka", "Kategori", "Barkod", "Stok Kodu", "Model Kodu", "Fiyat", "İndirimli Fiyat", "Maliyet", "Stok", "Para Birimi", "Görsel", "Görseller", "Ağırlık", "Boyutlar", "KDV", "Teslim Süresi", "Üretici", "Garanti", "Kargo Ücreti", "Ürün Linki", "Varyant Veri", "Ham JSON", "Durum"];
    const keys = ["id", "sourceId", "externalId", "name", "description", "brand", "category", "barcode", "stockCode", "modelCode", "price", "discountedPrice", "costPrice", "stock", "currency", "image", "images", "weight", "dimensions", "vatRate", "deliveryTime", "manufacturer", "warranty", "shippingCost", "productUrl", "variantData", "metadataJson", "status"];
    const rows = transformedProducts.map((p) => keys.map((k) => p[k] ?? ""));
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
