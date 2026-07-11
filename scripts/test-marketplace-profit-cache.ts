/**
 * ENA_DEALER_ANALYSIS_PROFIT_REAL_CACHE_V1 tests
 * Run: npx tsx scripts/test-marketplace-profit-cache.ts
 */
import { getCommissionRate } from "../src/lib/marketplace-intelligence/marketplace-commission-cache";
import { getShippingPrice } from "../src/lib/marketplace-intelligence/marketplace-shipping-cache";
import { searchMarketplaceCategories } from "../src/lib/marketplace-intelligence/marketplace-category-search";
import { calculateMarketplaceProfit } from "../src/lib/marketplace-intelligence/marketplace-profit-engine";

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

function main() {
  console.log("ENA_DEALER_ANALYSIS_PROFIT_REAL_CACHE_V1\n");

  const tyShip90 = getShippingPrice("trendyol", "yurtici", 90);
  assert(tyShip90 !== null && tyShip90 > 0, `Trendyol + Yurtiçi + 90 desi → ₺${tyShip90}`);

  const n11Ship10 = getShippingPrice("n11", "yurtici", 10);
  assert(n11Ship10 === 94.9, `N11 + Yurtiçi + 10 desi → ₺${n11Ship10} (beklenen 94.9)`);

  const noCategory = calculateMarketplaceProfit({
    marketplace: "trendyol",
    categoryId: "",
    salePrice: 500,
    productCost: 200,
    vatRatePercent: 20,
    carrier: "yurtici",
    desi: 10,
    packagingCost: 0,
    adRatePercent: 0,
    campaignDiscountPercent: 0,
    extraFixedCost: 0,
  });
  assert(noCategory.errors.includes("Kategori seçilmeli"), "Kategori yoksa uyarı");

  const noCommission = calculateMarketplaceProfit({
    marketplace: "trendyol",
    categoryId: "invalid-cat",
    salePrice: 500,
    productCost: 200,
    vatRatePercent: 20,
    carrier: "yurtici",
    desi: 10,
    packagingCost: 0,
    adRatePercent: 0,
    campaignDiscountPercent: 0,
    extraFixedCost: 0,
  });
  assert(
    noCommission.errors.some((e) => e.includes("Kategori") || e.includes("Komisyon")),
    "Geçersiz kategori → hata",
  );

  const noShip = calculateMarketplaceProfit({
    marketplace: "trendyol",
    categoryId: "ty-cam-tablo",
    salePrice: 500,
    productCost: 200,
    vatRatePercent: 20,
    carrier: "yurtici",
    desi: 9999,
    packagingCost: 0,
    adRatePercent: 0,
    campaignDiscountPercent: 0,
    extraFixedCost: 0,
  });
  assert(noShip.errors.includes("Kargo fiyatı tanımlı değil"), "Kargo yoksa uyarı");

  const commission = getCommissionRate("trendyol", "ty-cam-tablo");
  assert(commission === 21.5, `Trendyol Cam Tablo komisyon %${commission}`);

  const camSearch = searchMarketplaceCategories("cam tablo", { limit: 4 });
  assert(camSearch.length >= 2, `Kategori arama "cam tablo" → ${camSearch.length} sonuç`);
  assert(camSearch.some((s) => s.name === "Cam Tablo"), "Cam Tablo önerisi var");

  const haliSearch = searchMarketplaceCategories("halı", { marketplace: "n11", limit: 3 });
  assert(haliSearch.some((s) => s.enaSlug === "hali"), "N11 halı eşlemesi");

  const full = calculateMarketplaceProfit({
    marketplace: "trendyol",
    categoryId: "ty-cam-tablo",
    salePrice: 799,
    productCost: 250,
    vatRatePercent: 20,
    carrier: "yurtici",
    desi: 10,
    packagingCost: 18,
    adRatePercent: 7,
    campaignDiscountPercent: 4,
    extraFixedCost: 5,
    targetMarginPercent: 22,
  });
  assert(full.ready && full.errors.length === 0, "Tam veri ile hesap hazır");
  assert(full.netProfit !== 0, `Net kâr hesaplandı: ₺${full.netProfit}`);
  assert(full.breakEvenPrice != null && full.breakEvenPrice > 0, `Başa baş: ₺${full.breakEvenPrice}`);
  assert(full.suggestedSalePrice != null && full.suggestedSalePrice > full.breakEvenPrice!, "Önerilen fiyat > başa baş");
  assert(full.riskLabel != null, `Risk etiketi: ${full.riskLabel}`);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
