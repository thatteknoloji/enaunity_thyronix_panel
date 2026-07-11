import { prisma } from "@/lib/db";
import { generateFeedXml } from "@/lib/thyronix/xml-generator";
import { getTemplate } from "@/lib/thyronix/templates";
import {
  feedOutputHeaders,
  parsePartFromRequest,
  resolveFeedChunkSlice,
} from "@/lib/thyronix/feed-output-service";
import { planFeedChunks } from "@/lib/thyronix/feed-chunk";
import { isFeedXmlCacheFresh, readFeedXmlCache, writeFeedXmlCache } from "@/lib/thyronix/feed-output-cache";
import { applyFeedTransformSettings, loadFeedTransformSettings, type FeedProduct } from "@/lib/thyronix/feed-transform";
import { resolveFeedSourceIds } from "@/lib/thyronix/source-feed-provision";
import { prepareProductsForFeedOutput, applySourceFixedVat } from "@/lib/thyronix/feed-output-prep";
import { loadSourceVatDefaults } from "@/lib/thyronix/source-vat-detection";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const part = parsePartFromRequest(req);

  try {
    const feed = await prisma.thyronixFeed.findUnique({ where: { id } });
    if (!feed) return new Response("Feed not found", { status: 404, headers: { "Content-Type": "text/plain" } });

    const template = getTemplate(feed.outputFormat || "jetteknoloji");
    if (!template) return new Response("Unknown template", { status: 400, headers: { "Content-Type": "text/plain" } });

    if (await isFeedXmlCacheFresh(feed.id, part, feed.lastPublished)) {
      const cached = await readFeedXmlCache(feed.id, part);
      if (cached) {
        const cachedPlan = planFeedChunks(feed.productCount || 0);
        const cachedIndex = Math.min(Math.max(part, 1), Math.max(cachedPlan.partCount, 1)) - 1;
        const cachedPart =
          cachedPlan.parts[cachedIndex] || { part: 1, offset: 0, limit: feed.productCount || 0, productCount: feed.productCount || 0, label: "Parça 1/1" };
        return new Response(cached, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=600",
            ...feedOutputHeaders(cachedPlan, { part: cachedPart.part, offset: cachedPart.offset, limit: cachedPart.limit }),
          },
        });
      }
    }

    const sourceIds = await resolveFeedSourceIds(feed);
    const { products, plan, partMeta } = await resolveFeedChunkSlice(feed, sourceIds, part);
    const transformSettings = await loadFeedTransformSettings(feed.dealerId);
    const sourceVatDefaults = await loadSourceVatDefaults(sourceIds);
    const transformedProducts = applyFeedTransformSettings(products as FeedProduct[], transformSettings);

    const productsWithVariants = prepareProductsForFeedOutput(
      applySourceFixedVat(transformedProducts as FeedProduct[], sourceVatDefaults),
      template,
    );

    const generatedAt = new Date();
    const xml = generateFeedXml(productsWithVariants as never, template);
    await writeFeedXmlCache(feed.id, partMeta.part, xml);
    await prisma.thyronixFeed
      .update({
        where: { id: feed.id },
        data: { productCount: plan.totalProducts, lastPublished: generatedAt, status: "active" },
      })
      .catch(() => null);

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
