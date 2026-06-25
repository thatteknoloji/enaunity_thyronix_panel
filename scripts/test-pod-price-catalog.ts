/**
 * ENA_POD_PRICE_CATALOG_V1 tests
 * Run: npx tsx scripts/test-pod-price-catalog.ts
 */
import { tryCalculateFromCatalog } from "../src/lib/pricing-engine/catalog-pricing-engine";
import {
  KIRLENT_PACK4_VARIANT,
  lookupCatalogPrice,
  POST_KESIM_OPTION_CODE,
} from "../src/lib/pricing-engine/pod-price-catalog";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function assertPrice(
  ruleCode: string,
  opts: {
    widthCm?: number;
    heightCm?: number;
    sizeVariantKey?: string;
    variantCodes?: string[];
    optionCodes?: string[];
  },
  expected: number,
  label: string
) {
  const hit = lookupCatalogPrice({ ruleCode, ...opts });
  if (!hit) {
    assert(false, `${label} — katalog eşleşmesi yok`);
    return;
  }
  assert(hit.finalPrice === expected, `${label} → ₺${hit.finalPrice} (beklenen ₺${expected})`);
}

function main() {
  console.log("ENA_POD_PRICE_CATALOG_V1 tests\n");

  assertPrice("CURTAIN_CATALOG_V1", { widthCm: 280, heightCm: 240 }, 1750, "Perde 280×240");

  assertPrice("CARPET_CATALOG_V1", { widthCm: 200, heightCm: 300 }, 2040, "Halı 200×300 (6 m² × 340)");

  assertPrice("CUSHION_CATALOG_V1", { widthCm: 50, heightCm: 50 }, 105, "Kırlent 50×50 tekli");

  assertPrice(
    "CUSHION_CATALOG_V1",
    { widthCm: 50, heightCm: 50, sizeVariantKey: KIRLENT_PACK4_VARIANT },
    420,
    "Kırlent 50×50 4'lü"
  );

  assertPrice("MDF_TABLO_CATALOG_V1", { widthCm: 50, heightCm: 70 }, 276, "MDF Tablo 50×70");

  assertPrice("CAM_CATALOG_V1", { widthCm: 90, heightCm: 60 }, 1687, "Cam 90×60");

  assertPrice(
    "CAM_CATALOG_V1",
    { widthCm: 50, heightCm: 50, sizeVariantKey: "round" },
    900,
    "Cam yuvarlak 50×50"
  );

  const withPost = lookupCatalogPrice({
    ruleCode: "CUSHION_CATALOG_V1",
    widthCm: 50,
    heightCm: 50,
    optionCodes: [POST_KESIM_OPTION_CODE],
  });
  assert(withPost?.finalPrice === 205, "Post kesim +100 (105+100=205)");

  const viaEngine = tryCalculateFromCatalog({
    ruleCode: "CURTAIN_CATALOG_V1",
    widthCm: 280,
    heightCm: 240,
    writeLog: false,
  } as never);
  assert(viaEngine?.finalPrice === 1750, "tryCalculateFromCatalog entegrasyonu");

  const fallback = lookupCatalogPrice({
    ruleCode: "CARPET_CATALOG_V1",
    widthCm: 150,
    heightCm: 200,
  });
  assert(fallback?.finalPrice === 1020, "Halı özel ölçü 150×200 → 3 m² × 340 = 1020");

  const noMatch = lookupCatalogPrice({
    ruleCode: "CURTAIN_CATALOG_V1",
    widthCm: 100,
    heightCm: 100,
  });
  assert(noMatch === null, "Perde eşleşmeyen ölçü → null (formula fallback)");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
