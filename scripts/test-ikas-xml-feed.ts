/**
 * ikas XML feed offline smoke test (no network)
 * Run: npx tsx scripts/test-ikas-xml-feed.ts
 */
import { readFileSync } from "fs";
import { groupByModelCode } from "../src/lib/products/marketplace-import/grouper";
import { parseFeedXmlToRows } from "../src/lib/products/xml-feed/parser";
import { IKAS_DEFAULT_RULES, previewPriceSamples } from "../src/lib/products/xml-feed/price-rules";
import { parseFeedRules, transformImportRows } from "../src/lib/products/xml-feed/transform";
import { DEFAULT_XML_FEED_RULES } from "../src/lib/products/xml-feed/types";

const SAMPLE =
  process.env.IKAS_SAMPLE_XML ||
  "/Users/korhanbariskaynar/.cursor/projects/Users-korhanbariskaynar-Desktop-b-t-n-programlar-enaunity/uploads/bbb0cdda-0d7a-4127-a0cf-f3e36823e269-0.xml";

function main() {
  const xml = readFileSync(SAMPLE, "utf8");
  const body = xml.includes("<?xml") ? xml.slice(xml.indexOf("<?xml")) : xml;
  const { rows, categoryValues } = parseFeedXmlToRows(body, "ikas", {}, {});
  const rules = parseFeedRules({ ...DEFAULT_XML_FEED_RULES, ...IKAS_DEFAULT_RULES });
  const transformed = transformImportRows(rows, rules);
  const { groups } = groupByModelCode(transformed);
  const prices = previewPriceSamples(rules);

  console.log("rows", rows.length, "groups", groups.length, "categories", categoryValues.length);
  console.log("price samples", prices);
  console.log("sample", transformed[0]?.name?.slice(0, 50), transformed[0]?.price, transformed[0]?.brand);

  const p36 = prices.find((p) => p.base === 36);
  const p2040 = prices.find((p) => p.base === 2040);
  if (!p36 || p36.sale !== 72) throw new Error(`36₺ → expected 72, got ${p36?.sale}`);
  if (!p2040 || p2040.sale !== 2550) throw new Error(`2040₺ → expected 2550, got ${p2040?.sale}`);
  if (rows.length < 50) throw new Error(`too few rows: ${rows.length}`);
  if (!transformed.some((r) => r.brand && r.brand !== "Ena Unity")) {
    throw new Error("feed brands not preserved");
  }
  console.log("OK");
}

main();
