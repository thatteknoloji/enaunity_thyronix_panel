import { prisma } from "@/lib/db";
import { resolveFeedSourceIds } from "./source-feed-provision";
import { loadMergedFeedProductsForOutput } from "./feed-output-service";
import { planFeedChunks, type FeedChunkPlan } from "./feed-chunk";
import { loadFeedTransformSettings, applyFeedTransformSettings, type FeedProduct } from "./feed-transform";
import { parseVariantData } from "./source-metadata";
import { generateFeedXml } from "./xml-generator";
import { getTemplate } from "./templates";
import { writeFeedXmlCache } from "./feed-output-cache";

export async function warmFeedXmlCache(feedId: string): Promise<{
  feedId: string;
  productCount: number;
  plan: FeedChunkPlan;
  paths: string[];
}> {
  const feed = await prisma.thyronixFeed.findUnique({ where: { id: feedId } });
  if (!feed) {
    throw new Error(`Feed bulunamadı: ${feedId}`);
  }

  const template = getTemplate(feed.outputFormat || "jetteknoloji");
  if (!template) {
    throw new Error(`Template bulunamadı: ${feed.outputFormat}`);
  }

  const sourceIds = await resolveFeedSourceIds(feed);
  const { products: merged } = await loadMergedFeedProductsForOutput(feed, sourceIds);
  const plan = planFeedChunks(merged.length);
  const transformSettings = await loadFeedTransformSettings(feed.dealerId);
  const publishedAt = new Date();

  await prisma.thyronixFeed.update({
    where: { id: feed.id },
    data: {
      productCount: merged.length,
      lastPublished: publishedAt,
      status: "active",
    },
  });

  const paths: string[] = [];
  for (const part of plan.parts) {
    const products = merged.slice(part.offset, part.offset + part.limit);
    const transformedProducts = applyFeedTransformSettings(products as FeedProduct[], transformSettings);
    const productsWithVariants = transformedProducts.map((product) => ({
      ...product,
      variants: parseVariantData((product as { variantData?: string | null }).variantData),
    }));

    const xml = generateFeedXml(productsWithVariants as never, template);
    const filePath = await writeFeedXmlCache(feed.id, part.part, xml);
    paths.push(filePath);
  }

  return {
    feedId: feed.id,
    productCount: merged.length,
    plan,
    paths,
  };
}
