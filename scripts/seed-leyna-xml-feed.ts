/**
 * Leyna XML feed pilot — production seed + ilk sync
 * Run: SEED_LEYNA=1 npx tsx scripts/seed-leyna-xml-feed.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env.production" });
config({ path: ".env" });

import { prisma } from "../src/lib/db";
import { DEFAULT_XML_FEED_RULES } from "../src/lib/products/xml-feed/types";
import { DEFAULT_FIELD_MAPPINGS, DEFAULT_VARIANT_MAPPINGS } from "../src/lib/products/xml-feed/templates";
import { suggestCategoryMapping } from "../src/lib/products/xml-feed/category-mapper";
import { previewXmlFeedSync } from "../src/lib/products/xml-feed/sync-runner";
import { runXmlFeedSync } from "../src/lib/products/xml-feed/sync-runner";

const LEYNA_URL =
  "https://www.leyna.com.tr/export/1/a8564c17c365406e7d61aa34e6db9e9a31fb20b8";

async function main() {
  const rootCategory = "Kadın İç Giyim";
  const templateId = "leyna_v2";

  const preview = await previewXmlFeedSync({
    feedUrl: LEYNA_URL,
    templateId,
    mappingJson: JSON.stringify(DEFAULT_FIELD_MAPPINGS.leyna_v2),
    categoryMappingJson: "{}",
    rootCategory,
    rulesJson: JSON.stringify(DEFAULT_XML_FEED_RULES),
  });

  const storeCategories = await prisma.category.findMany({
    where: { active: true },
    select: { name: true },
  });
  const categoryMapping = suggestCategoryMapping(preview.categoryValues, storeCategories);

  let feed = await prisma.productXmlFeed.findFirst({
    where: { feedUrl: LEYNA_URL },
  });

  if (!feed) {
    feed = await prisma.productXmlFeed.create({
      data: {
        name: "Leyna Kadın İç Giyim",
        feedUrl: LEYNA_URL,
        rootCategory,
        templateId,
        mappingJson: JSON.stringify(DEFAULT_FIELD_MAPPINGS.leyna_v2),
        variantMappingJson: JSON.stringify(DEFAULT_VARIANT_MAPPINGS.leyna_v2),
        categoryMappingJson: JSON.stringify(categoryMapping),
        rulesJson: JSON.stringify(DEFAULT_XML_FEED_RULES),
        syncIntervalHours: 12,
        nextSyncAt: new Date(),
        createdBy: "seed-leyna-xml-feed",
      },
    });
    console.log("✓ Feed oluşturuldu:", feed.id);
  } else {
    feed = await prisma.productXmlFeed.update({
      where: { id: feed.id },
      data: {
        categoryMappingJson: JSON.stringify(categoryMapping),
        status: "ACTIVE",
      },
    });
    console.log("✓ Feed güncellendi:", feed.id);
  }

  console.log("→ İlk sync başlıyor…");
  const report = await runXmlFeedSync(feed.id);
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
