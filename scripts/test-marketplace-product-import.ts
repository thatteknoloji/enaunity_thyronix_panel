/**
 * Unit tests for marketplace product import grouper + parent field logic.
 * Run: npx tsx scripts/test-marketplace-product-import.ts
 */
import { groupByModelCode } from "../src/lib/products/marketplace-import/grouper";
import type { ParsedImportRow } from "../src/lib/products/marketplace-import/types";

function row(partial: Partial<ParsedImportRow> & { modelCode: string; sku: string; barcode: string }): ParsedImportRow {
  return {
    rowIndex: 1,
    name: "Default Name",
    description: "",
    brand: "Brand",
    category: "Cam Tablo",
    price: 100,
    stock: 5,
    image: "",
    images: [],
    variantOptions: [],
    raw: {},
    errors: [],
    warnings: [],
    ...partial,
  };
}

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log("=== groupByModelCode ===");

const rows = [
  row({ rowIndex: 2, modelCode: "taso_999_T", sku: "SKU-A", barcode: "111", name: "Cam Tablo 25x35", description: "Kısa açıklama", seoTitle: "Cam Tablo SEO", geoTargets: "Türkiye", aeoAnswerSummary: "Kısa AEO", variantOptions: [{ group: "Boyut/Ebat", value: "25x35" }] }),
  row({ rowIndex: 3, modelCode: "taso_999_T", sku: "SKU-B", barcode: "222", name: "Cam Tablo 25x35", description: "Uzun açıklama metni burada", aeoAnswerSummary: "En uzun ve en açıklayıcı AEO cevabı burada", variantOptions: [{ group: "Boyut/Ebat", value: "35x50" }] }),
  row({ rowIndex: 4, modelCode: "taso_999_T", sku: "SKU-C", barcode: "333", name: "Cam Tablo Farklı İsim", description: "Orta", variantOptions: [{ group: "Renk", value: "Siyah" }] }),
  row({ rowIndex: 5, modelCode: "other_model", sku: "SKU-D", barcode: "444", name: "Başka Ürün", description: "Desc" }),
];

const { groups, ungroupedRows } = groupByModelCode(rows);
assert(groups.length === 2, "2 model code groups");
assert(ungroupedRows.length === 0, "no ungrouped rows");
assert(groups[0].rows.length === 3 || groups[1].rows.length === 3, "taso group has 3 variants");

const taso = groups.find((g) => g.modelCode === "taso_999_T")!;
assert(!!taso, "taso_999_T group exists");
assert(taso.name === "Cam Tablo 25x35", "parent title = most frequent name");
assert(taso.description === "Uzun açıklama metni burada", "parent description = longest");
assert(taso.seoTitle === "Cam Tablo SEO", "parent SEO title is preserved");
assert(taso.geoTargets === "Türkiye", "parent GEO targets are preserved");
assert(taso.aeoAnswerSummary === "En uzun ve en açıklayıcı AEO cevabı burada", "parent AEO summary = longest");
assert(taso.stock === 15, "parent stock = sum of variants (5*3)");
assert(taso.price === 100, "parent price = min variant price");

console.log("\n=== barcode conflict row ===");
const bad = row({ modelCode: "", sku: "X", barcode: "999", errors: ["Model Kodu eksik"] });
const { ungroupedRows: u2 } = groupByModelCode([bad]);
assert(u2.length === 1, "missing model code → ungrouped");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
