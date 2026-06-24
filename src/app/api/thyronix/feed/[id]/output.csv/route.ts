import { prisma } from "@/lib/db";
import {
  feedOutputHeaders,
  parsePartFromRequest,
  resolveFeedChunkSlice,
} from "@/lib/thyronix/feed-output-service";
import { applyFeedTransformSettings, loadFeedTransformSettings, type FeedProduct } from "@/lib/thyronix/feed-transform";
import { resolveFeedSourceIds } from "@/lib/thyronix/source-feed-provision";

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

    const sourceIds = await resolveFeedSourceIds(feed);
    const { products, plan, partMeta } = await resolveFeedChunkSlice(feed, sourceIds, part);
    const transformSettings = await loadFeedTransformSettings(feed.dealerId);
    const transformedProducts = applyFeedTransformSettings(products as FeedProduct[], transformSettings);

    const headers = ["name", "description", "brand", "category", "barcode", "stockCode", "modelCode", "price", "stock", "currency", "status", "images"];
    const BOM = "\uFEFF";
    const csv =
      BOM +
      [headers.join(","), ...transformedProducts.map((p) => headers.map((h) => escapeCsv(p[h])).join(","))].join("\n");

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
