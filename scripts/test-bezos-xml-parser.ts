/**
 * Bezos BAYİ XML parser doğrulama testi
 * Run: npx tsx scripts/test-bezos-xml-parser.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { getTemplate, type FeedTemplate } from "../src/lib/thyronix/templates";
import { inspectXmlFeed, parseXmlToProducts } from "../src/lib/thyronix/xml-parser";
import { productToThyronixRow, parseFixedValues } from "../src/lib/thyronix/feed-fetch";
import { BEZOS_BAYI_MAPPING_DOC } from "../src/lib/thyronix/connectors/bezos-bayi-xml";

const xml = readFileSync(join(process.cwd(), "scripts/data/bezos-bayi-sample.xml"), "utf-8");
const template = getTemplate("bezos");

if (!template) {
  console.error("Bezos şablonu bulunamadı");
  process.exit(1);
}

const products = parseXmlToProducts(xml, template);
const inspected = inspectXmlFeed(xml, template);
console.log(`\n✓ ${products.length} ürün parse edildi\n`);
console.log(`✓ ${inspected.detectedFields.length} alan, ${inspected.variantFields.length} varyant alanı tespit edildi\n`);

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

const variantXml = `<?xml version="1.0" encoding="UTF-8"?>
<products>
  <product>
    <name>Varyantlı Ürün</name>
    <barcode>ANA-1</barcode>
    <price>100</price>
    <variants>
      <variant>
        <specName1>Renk</specName1>
        <specValue1>Siyah</specValue1>
        <variant_barcode>VR-1</variant_barcode>
      </variant>
    </variants>
  </product>
</products>`;

const variantTemplate: FeedTemplate = {
  id: "variant-test",
  name: "Variant Test",
  group: "Test",
  rootElement: "products",
  itemElement: "product",
  variantElement: "variants",
  variantItemElement: "variant",
  cdataFields: [],
  fieldMap: {
    name: "name",
    barcode: "barcode",
    price: "price",
    stock: "stock",
  },
};

const variantProducts = parseXmlToProducts(variantXml, variantTemplate, undefined, {
  specName1: "variantGroup",
  specValue1: "variantValue",
  variant_barcode: "variantBarcode",
});

const variantData = JSON.parse(variantProducts[0]?.variantData || "[]");
if (!variantData.length || variantData[0]?.options?.[0]?.group !== "Renk" || variantData[0]?.options?.[0]?.value !== "Siyah") {
  console.error("✗ Yeni varyant group/value mapping başarısız");
  process.exit(1);
}

console.log("✓ Varyant group/value mapping çalışıyor");
