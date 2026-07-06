/**
 * Mevcut XML feed'ler için kategori ağacını oluşturur.
 * Kullanım: npx tsx scripts/backfill-xml-category-tree.ts
 */
import { prisma } from "../src/lib/db";
import { ensureXmlCategoryTree } from "../src/lib/products/xml-feed/category-mapper";

function parseCategoryMapping(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function main() {
  const feeds = await prisma.productXmlFeed.findMany({ where: { status: "ACTIVE" } });
  console.log(`Aktif feed: ${feeds.length}`);

  for (const feed of feeds) {
    const mapping = parseCategoryMapping(feed.categoryMappingJson);
    const links = await prisma.productFeedLink.findMany({
      where: { feedId: feed.id },
      include: { product: { select: { category: true } } },
    });

    const mappedPaths = new Set<string>();
    for (const [src, dest] of Object.entries(mapping)) {
      if (dest?.trim()) mappedPaths.add(dest.trim());
      else if (src?.trim()) mappedPaths.add(src.trim());
    }
    for (const link of links) {
      if (link.product.category?.trim()) mappedPaths.add(link.product.category.trim());
    }

    const paths = [...mappedPaths];
    console.log(`Feed "${feed.name}" (${feed.rootCategory}): ${paths.length} kategori yolu`);
    await ensureXmlCategoryTree(feed.id, feed.rootCategory, paths);
  }

  console.log("Tamamlandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
