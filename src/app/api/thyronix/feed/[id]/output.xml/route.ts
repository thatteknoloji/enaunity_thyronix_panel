import { prisma } from "@/lib/db";
import { generateFeedXml } from "@/lib/thyronix/xml-generator";
import { getTemplate } from "@/lib/thyronix/templates";
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
    if (!feed) return new Response("Feed not found", { status: 404, headers: { "Content-Type": "text/plain" } });

    const template = getTemplate(feed.outputFormat || "jetteknoloji");
    if (!template) return new Response("Unknown template", { status: 400, headers: { "Content-Type": "text/plain" } });

    const sourceIds = await resolveFeedSourceIds(feed);
    const { products, plan, partMeta } = await resolveFeedChunkSlice(feed, sourceIds, part);
    const transformSettings = await loadFeedTransformSettings(feed.dealerId);
    const transformedProducts = applyFeedTransformSettings(products as FeedProduct[], transformSettings);

    const productsWithVariants = transformedProducts.map((p) => ({
      ...p,
      variants: [] as Array<Record<string, unknown>>,
    }));

    const xml = generateFeedXml(productsWithVariants as never, template);

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=600",
        ...feedOutputHeaders(plan, partMeta),
      },
    });
  } catch {
    return new Response("Feed generation error", { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}
