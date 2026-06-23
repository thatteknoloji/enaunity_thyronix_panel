import { prisma } from "@/lib/db";
import {
  feedOutputHeaders,
  loadActiveSourceIds,
  parsePartFromRequest,
  resolveFeedChunkSlice,
} from "@/lib/thyronix/feed-output-service";

export const dynamic = "force-dynamic";

function escapeCsv(val: unknown): string {
  const s = String(val ?? "").replace(/"/g, '""');
  return /[",;\n\r]/.test(s) ? `"${s}"` : s;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const part = parsePartFromRequest(req);

  try {
    const feed = await prisma.thyronixFeed.findUnique({ where: { id } });
    if (!feed) return new Response("Feed bulunamadı", { status: 404 });

    const sourceIds = await loadActiveSourceIds({ dealerId: feed.dealerId });
    const { products, plan, partMeta } = await resolveFeedChunkSlice(feed, sourceIds, part);

    const headers = ["name", "description", "brand", "category", "barcode", "stockCode", "modelCode", "price", "stock", "currency", "status", "images"];
    const BOM = "\uFEFF";
    const csv =
      BOM +
      [headers.join(","), ...products.map((p) => headers.map((h) => escapeCsv(p[h])).join(","))].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="thyronix-feed-${id}-part${partMeta.part}.csv"`,
        ...feedOutputHeaders(plan, partMeta),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    return new Response(msg, { status: 500 });
  }
}
