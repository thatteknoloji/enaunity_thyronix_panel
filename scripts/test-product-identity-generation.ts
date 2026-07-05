/**
 * Unit tests for ENA product variant identity generation.
 * Run: npx tsx scripts/test-product-identity-generation.ts
 */
import { applyImportIdentityGeneration } from "../src/lib/products/marketplace-import/identity-generation";
import type { ParsedImportRow } from "../src/lib/products/marketplace-import/types";
import { buildVariantIdentityCodes, generateEan13 } from "../src/lib/products/product-identity-generation";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
    return;
  }
  failed += 1;
  console.error(`  ✗ ${message}`);
}

function isEan13(value: string) {
  return /^\d{13}$/.test(value);
}

function row(partial: Partial<ParsedImportRow> & { modelCode: string }): ParsedImportRow {
  return {
    rowIndex: 1,
    name: "Cam Tablo 25x35",
    description: "",
    brand: "ENA",
    category: "Cam Tablo",
    modelCode: partial.modelCode,
    sku: "",
    barcode: "",
    price: 100,
    stock: 5,
    image: "",
    images: [],
    variantOptions: [{ group: "Ebat", value: "25x35" }],
    raw: {},
    errors: ["Stok Kodu eksik", "Barkod eksik"],
    warnings: [],
    ...partial,
  };
}

console.log("=== product identity generation ===");

const barcode = generateEan13("test-seed", "29");
assert(isEan13(barcode), "generated barcode is EAN-13 length");
assert(barcode.startsWith("29"), "generated barcode keeps prefix");

const uniqueCodes = buildVariantIdentityCodes({
  baseSku: "CAM",
  variants: [
    { options: [{ group: "Ebat", value: "25x35" }] },
    { options: [{ group: "Ebat", value: "35x50" }] },
  ],
  settings: { variantSkuMode: "unique", generateVariantBarcode: true, fillOnlyEmpty: false },
});
assert(uniqueCodes[0].sku !== uniqueCodes[1].sku, "unique mode creates different variant SKUs");
assert(uniqueCodes.every((item) => isEan13(item.barcode)), "unique mode creates variant barcodes");

const sameSkuCodes = buildVariantIdentityCodes({
  baseSku: "CAM",
  variants: [
    { options: [{ group: "Ebat", value: "25x35" }] },
    { options: [{ group: "Ebat", value: "35x50" }] },
  ],
  settings: { variantSkuMode: "same_as_product", generateVariantBarcode: true, fillOnlyEmpty: false },
});
assert(sameSkuCodes[0].sku === "CAM" && sameSkuCodes[1].sku === "CAM", "same_as_product mode keeps parent SKU");
assert(sameSkuCodes[0].barcode !== sameSkuCodes[1].barcode, "same SKU mode still creates different barcodes");

console.log("\n=== import identity generation ===");

const rows = applyImportIdentityGeneration(
  [
    row({ rowIndex: 1, modelCode: "MODEL-1" }),
    row({ rowIndex: 2, modelCode: "MODEL-1", variantOptions: [{ group: "Ebat", value: "35x50" }] }),
  ],
  {
    enabled: true,
    fillOnlyEmpty: true,
    generateVariantBarcode: true,
    variantSkuMode: "unique",
    barcodePrefix: "29",
    autoSeo: true,
  },
);

assert(rows.every((item) => item.sku), "import fills missing SKUs");
assert(rows.every((item) => isEan13(item.barcode)), "import fills missing EAN-13 barcodes");
assert(rows.every((item) => item.errors.length === 0), "import clears fixed missing-code errors");
assert(rows.every((item) => item.seoTitle && item.seoDescription && item.aeoAnswerSummary), "import fills SEO/AEO drafts");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
