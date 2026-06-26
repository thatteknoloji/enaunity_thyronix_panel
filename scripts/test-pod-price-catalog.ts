/**
 * ENA_POD_PRICE_CATALOG_V1 tests
 * Run: npx tsx scripts/test-pod-price-catalog.ts
 */
import { tryCalculateFromCatalog } from "../src/lib/pricing-engine/catalog-pricing-engine";
import { calculatePricing, isCatalogBackedPricingInput } from "../src/lib/pricing-engine/pricing-service";
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

async function main() {
  console.log("ENA_POD_PRICE_CATALOG_V1 tests\n");

  assertPrice("CURTAIN_CATALOG_V1", { widthCm: 280, heightCm: 240 }, 1750, "Perde 280×240");

  assertPrice("CARPET_CATALOG_V1", { widthCm: 200, heightCm: 300 }, 2040, "Halı 200×300 (6 m² × 340)");

  assertPrice("CUSHION_CATALOG_V1", { widthCm: 43, heightCm: 43 }, 80, "Kırlent 43×43 tekli");
  assertPrice("CUSHION_CATALOG_V1", { widthCm: 50, heightCm: 50 }, 105, "Kırlent 50×50 tekli");
  assertPrice("CUSHION_CATALOG_V1", { widthCm: 60, heightCm: 60 }, 115, "Kırlent 60×60 tekli");

  assertPrice(
    "CUSHION_CATALOG_V1",
    { widthCm: 43, heightCm: 43, sizeVariantKey: KIRLENT_PACK4_VARIANT },
    320,
    "Kırlent 43×43 4'lü (sizeVariantKey)"
  );
  assertPrice(
    "CUSHION_CATALOG_V1",
    { widthCm: 50, heightCm: 50, sizeVariantKey: KIRLENT_PACK4_VARIANT },
    420,
    "Kırlent 50×50 4'lü (sizeVariantKey)"
  );
  assertPrice(
    "CUSHION_CATALOG_V1",
    { widthCm: 60, heightCm: 60, sizeVariantKey: KIRLENT_PACK4_VARIANT },
    460,
    "Kırlent 60×60 4'lü (sizeVariantKey)"
  );

  assertPrice(
    "CUSHION_CATALOG_V1",
    { widthCm: 50, heightCm: 50, optionCodes: ["pack4"] },
    420,
    "Kırlent 50×50 4'lü (optionCodes pack4)"
  );
  assertPrice(
    "CUSHION_CATALOG_V1",
    { widthCm: 50, heightCm: 50, optionCodes: ["KIRLENT_4LU"] },
    420,
    "Kırlent 50×50 4'lü (optionCodes KIRLENT_4LU)"
  );
  assertPrice(
    "CUSHION_CATALOG_V1",
    { widthCm: 50, heightCm: 50, sizeVariantKey: "CUSHION_50x50_PACK4" },
    420,
    "Kırlent 50×50 4'lü (CUSHION_50x50_PACK4 key)"
  );

  const qty4NoPack = lookupCatalogPrice({
    ruleCode: "CUSHION_CATALOG_V1",
    widthCm: 50,
    heightCm: 50,
    quantity: 4,
  });
  assert(qty4NoPack?.finalPrice === 105, "quantity=4 pack seçili değil → tekli fiyat (105)");

  assertPrice("MDF_TABLO_CATALOG_V1", { widthCm: 50, heightCm: 70 }, 276, "MDF Tablo 50×70");

  assertPrice("CAM_CATALOG_V1", { widthCm: 90, heightCm: 30 }, 940, "Cam 90×30");

  assertPrice(
    "CAM_CATALOG_V1",
    { widthCm: 60, heightCm: 60, sizeVariantKey: "round" },
    1140,
    "Cam yuvarlak 60×60"
  );

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

  const unavailable = await calculatePricing({
    ruleCode: "CAM_CATALOG_V1",
    catalogId: "CAM",
    widthCm: 12,
    heightCm: 12,
    writeLog: false,
  });
  assert(unavailable.priceAvailable === false, "Katalog miss → priceAvailable false (teknik hata yok)");
  assert(isCatalogBackedPricingInput({ ruleCode: "CAM_CATALOG_V1", catalogId: "CAM" }), "CAM catalog backed");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
