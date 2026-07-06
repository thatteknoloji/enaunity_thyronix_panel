/**
 * ikas Müzik Aletleri XML feed seed + ilk sync
 * Run: npx tsx scripts/seed-ikas-xml-feed.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env.production" });
config({ path: ".env" });

import { prisma } from "../src/lib/db";
import { suggestCategoryMapping } from "../src/lib/products/xml-feed/category-mapper";
import { IKAS_DEFAULT_RULES } from "../src/lib/products/xml-feed/price-rules";
import { previewXmlFeedSync, runXmlFeedSync } from "../src/lib/products/xml-feed/sync-runner";
import { DEFAULT_FIELD_MAPPINGS, DEFAULT_VARIANT_MAPPINGS } from "../src/lib/products/xml-feed/templates";
import { DEFAULT_XML_FEED_RULES } from "../src/lib/products/xml-feed/types";

const IKAS_URL =
  "https://ikas-exporter-app.ikasapps.com/api/exports/759bc351-6d49-4796-af14-07fcbe9b1523/bbb0cdda-0d7a-4127-a0cf-f3e36823e269.xml?templateType=1&showCategoryPath=true&showTotalStockCount=true&imageExtensionJPEG=true&showDiscountPrice=false&showPriceInfo=false&separateCategories=false";

async function main() {
  const rootCategory = "Müzik Aletleri";
  const templateId = "ikas";
  const rules = { ...DEFAULT_XML_FEED_RULES, ...IKAS_DEFAULT_RULES };

  const preview = await previewXmlFeedSync({
    feedUrl: IKAS_URL,
    templateId,
    mappingJson: JSON.stringify(DEFAULT_FIELD_MAPPINGS.ikas),
    variantMappingJson: JSON.stringify(DEFAULT_VARIANT_MAPPINGS.ikas),
    categoryMappingJson: "{}",
    rootCategory,
    rulesJson: JSON.stringify(rules),
  });

  console.log(`Önizleme: ${preview.totalRows} satır, ${preview.groupCount} ürün grubu`);

  const storeCategories = await prisma.category.findMany({
    where: { active: true },
    select: { name: true },
  });
  const categoryMapping = suggestCategoryMapping(preview.categoryValues, storeCategories);

  let feed = await prisma.productXmlFeed.findFirst({ where: { feedUrl: IKAS_URL } });

  if (!feed) {
    feed = await prisma.productXmlFeed.create({
      data: {
        name: "ikas Müzik Aletleri",
        feedUrl: IKAS_URL,
        rootCategory,
        templateId,
        mappingJson: JSON.stringify(DEFAULT_FIELD_MAPPINGS.ikas),
        variantMappingJson: JSON.stringify(DEFAULT_VARIANT_MAPPINGS.ikas),
        categoryMappingJson: JSON.stringify(categoryMapping),
        rulesJson: JSON.stringify(rules),
        syncIntervalHours: 12,
        nextSyncAt: new Date(),
        createdBy: "seed-ikas-xml-feed",
      },
    });
    console.log("✓ Feed oluşturuldu:", feed.id);
  } else {
    feed = await prisma.productXmlFeed.update({
      where: { id: feed.id },
      data: {
        rootCategory,
        templateId,
        categoryMappingJson: JSON.stringify(categoryMapping),
        rulesJson: JSON.stringify(rules),
        status: "ACTIVE",
      },
    });
    console.log("✓ Feed güncellendi:", feed.id);
  }

  console.log("→ Sync başlıyor…");
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
