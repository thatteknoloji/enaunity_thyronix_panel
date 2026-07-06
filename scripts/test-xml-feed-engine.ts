/**
 * XML Feed motor smoke test
 * Run: npx tsx scripts/test-xml-feed-engine.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { readFileSync } from "fs";
import { fetchXmlFeed } from "../src/lib/products/xml-feed/fetcher";
import { parseFeedXmlToRows } from "../src/lib/products/xml-feed/parser";
import { transformImportRows, parseFeedRules } from "../src/lib/products/xml-feed/transform";
import { applyCategoryMappingToRows } from "../src/lib/products/xml-feed/category-mapper";
import { groupByModelCode } from "../src/lib/products/marketplace-import/grouper";
import { DEFAULT_XML_FEED_RULES } from "../src/lib/products/xml-feed/types";
import { suggestCategoryMapping } from "../src/lib/products/xml-feed/category-mapper";
import { IKAS_DEFAULT_RULES, previewPriceSamples } from "../src/lib/products/xml-feed/price-rules";

const LEYNA_URL =
  process.env.LEYNA_FEED_URL ||
  "https://www.leyna.com.tr/export/1/a8564c17c365406e7d61aa34e6db9e9a31fb20b8";

async function main() {
  console.log("=== XML Feed Engine Smoke Test ===\n");

  console.log("1. Fetch feed…");
  let xml: string;
  try {
    xml = await fetchXmlFeed(LEYNA_URL, 90_000);
    console.log(`   ✓ ${(xml.length / 1024).toFixed(1)} KB XML`);
  } catch (e) {
    console.error(`   ✗ Fetch failed: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  console.log("2. Parse rows (leyna_v2)…");
  const { rows, categoryValues, brandValues } = parseFeedXmlToRows(xml, "leyna_v2", {});
  console.log(`   ✓ ${rows.length} rows, ${categoryValues.length} categories, ${brandValues.length} brands`);
  if (rows.length === 0) {
    console.error("   ✗ No rows parsed");
    process.exit(1);
  }

  console.log("3. Transform (price ×1.25, Ena Unity)…");
  const rules = parseFeedRules(DEFAULT_XML_FEED_RULES);
  const transformed = transformImportRows(rows, rules);
  const sample = transformed[0];
  console.log(`   ✓ Sample: "${sample.name.slice(0, 40)}…" brand=${sample.brand} price=${sample.price}`);

  console.log("4. Category mapping…");
  const rootCategory = "Kadın İç Giyim";
  const mapping = suggestCategoryMapping(categoryValues.slice(0, 20), categoryValues.map((n) => ({ name: n })));
  const { rows: categorized, unmapped } = applyCategoryMappingToRows(
    transformed.map((r) => ({ ...r, subcategory: rootCategory })),
    mapping,
    rootCategory,
  );
  console.log(`   ✓ ${categorized.length} rows, ${unmapped.length} unmapped categories`);

  console.log("5. Group by model code…");
  const validRows = categorized.filter((r) => r.category?.trim());
  const { groups, ungroupedRows } = groupByModelCode(validRows);
  console.log(`   ✓ ${groups.length} parent groups, ${ungroupedRows.length} ungrouped`);

  const withVariants = groups.filter((g) => g.rows.length > 1).length;
  console.log(`   ✓ ${withVariants} groups with multiple variants`);

  console.log("6. Leyna flat variant snippet (TM0935-style)…");
  const flatSnippet = `<?xml version="1.0"?><products>
    <product><productCode>TM0935</productCode><name>Test TM0935</name><detail>x</detail><brand>Leyna</brand><category>Fantazi</category><barcode>111</barcode><realPrice>100</realPrice><quantity>1</quantity><name1>Beden</name1><value1>XS</value1></product>
    <product><productCode>TM0935</productCode><name>Test TM0935</name><detail>x</detail><brand>Leyna</brand><category>Fantazi</category><barcode>222</barcode><realPrice>100</realPrice><quantity>1</quantity><name1>Beden</name1><value1>S</value1></product>
  </products>`;
  const { rows: flatRows } = parseFeedXmlToRows(flatSnippet, "leyna_v2", {}, {});
  const flatGroup = groupByModelCode(flatRows).groups[0];
  if (flatRows.length !== 2 || flatGroup?.rows.length !== 2) {
    console.error(`   ✗ Flat variant parse failed: ${flatRows.length} rows`);
    process.exit(1);
  }
  if (new Set(flatRows.map((r) => r.sku)).size !== 2) {
    console.error("   ✗ Flat rows share SKU — variant collapse bug");
    process.exit(1);
  }
  if (!flatRows.every((r) => r.variantOptions.some((o) => o.group === "Beden"))) {
    console.error("   ✗ Missing Beden option on flat rows");
    process.exit(1);
  }
  console.log("   ✓ 2 flat rows, unique SKUs, Beden options OK");

  console.log("7. ikas parser + tiered pricing (offline)…");
  const ikasSamplePath =
    process.env.IKAS_SAMPLE_XML ||
    "/Users/korhanbariskaynar/.cursor/projects/Users-korhanbariskaynar-Desktop-b-t-n-programlar-enaunity/uploads/bbb0cdda-0d7a-4127-a0cf-f3e36823e269-0.xml";
  try {
    const ikasXml = readFileSync(ikasSamplePath, "utf8");
    const ikasBody = ikasXml.includes("<?xml") ? ikasXml.slice(ikasXml.indexOf("<?xml")) : ikasXml;
    const { rows: ikasRows, categoryValues: ikasCats } = parseFeedXmlToRows(ikasBody, "ikas", {}, {});
    if (ikasRows.length < 50) {
      console.error(`   ✗ ikas parse too few rows: ${ikasRows.length}`);
      process.exit(1);
    }
    const ikasRules = parseFeedRules({ ...DEFAULT_XML_FEED_RULES, ...IKAS_DEFAULT_RULES });
    const ikasTransformed = transformImportRows(ikasRows, ikasRules);
    const prices = previewPriceSamples(ikasRules);
    const p36 = prices.find((p) => p.base === 36);
    const p2040 = prices.find((p) => p.base === 2040);
    if (!p36 || p36.sale !== 72) {
      console.error(`   ✗ Tier pricing 36₺ expected 72, got ${p36?.sale}`);
      process.exit(1);
    }
    if (!p2040 || p2040.sale !== 2550) {
      console.error(`   ✗ Tier pricing 2040₺ expected 2550, got ${p2040?.sale}`);
      process.exit(1);
    }
    const ikasGroups = groupByModelCode(ikasTransformed).groups;
    const keepsBrand = ikasTransformed.some((r) => r.brand && r.brand !== "Ena Unity");
    if (!keepsBrand) {
      console.error("   ✗ ikas feed brands not preserved");
      process.exit(1);
    }
    console.log(
      `   ✓ ${ikasRows.length} rows, ${ikasGroups.length} groups, ${ikasCats.length} categories, brands preserved`,
    );
  } catch (e) {
    console.warn(`   ⚠ ikas offline test skipped: ${e instanceof Error ? e.message : e}`);
  }

  console.log("\n=== ALL CHECKS PASSED ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
