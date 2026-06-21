/**
 * Bezos BAYİ XML parser doğrulama testi
 * Run: npx tsx scripts/test-bezos-xml-parser.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { getTemplate } from "../src/lib/thyronix/templates";
import { parseXmlToProducts } from "../src/lib/thyronix/xml-parser";
import { productToThyronixRow, parseFixedValues } from "../src/lib/thyronix/feed-fetch";
import { BEZOS_BAYI_MAPPING_DOC } from "../src/lib/thyronix/connectors/bezos-bayi-xml";

const xml = readFileSync(join(process.cwd(), "scripts/data/bezos-bayi-sample.xml"), "utf-8");
const template = getTemplate("bezos");

if (!template) {
  console.error("Bezos şablonu bulunamadı");
  process.exit(1);
}

const products = parseXmlToProducts(xml, template);
console.log(`\n✓ ${products.length} ürün parse edildi\n`);

for (const p of products) {
  const row = productToThyronixRow(p, "test-source", parseFixedValues('{"currency":"TRY"}'));
  console.log(JSON.stringify(row, null, 2));
}

const requiredFields = BEZOS_BAYI_MAPPING_DOC.filter((r) => r.required).map((r) => r.thyronixField);
let ok = true;
for (const p of products) {
  for (const field of requiredFields) {
    const val = (p as Record<string, unknown>)[field];
    if (val == null || val === "") {
      console.error(`✗ Eksik zorunlu alan: ${field} — ${p.name}`);
      ok = false;
    }
  }
}

if (ok) {
  console.log("\n✓ Tüm zorunlu alanlar dolu");
} else {
  process.exit(1);
}
