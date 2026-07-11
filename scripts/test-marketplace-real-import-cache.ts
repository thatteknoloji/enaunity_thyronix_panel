/**
 * ENA_DEALER_ANALYSIS_REAL_IMPORT_CACHE_V2 tests
 * Run: npx tsx scripts/test-marketplace-real-import-cache.ts
 */
import { getCommissionRate, getCommissionEntry } from "../src/lib/marketplace-intelligence/marketplace-commission-cache";
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
  console.log("ENA_DEALER_ANALYSIS_REAL_IMPORT_CACHE_V2\n");

  // 1. Trendyol + Yurtiçi + 90 desi — PDF değeri (sentetik değil)
  const tyShip90 = getShippingPrice("trendyol", "yurtici", 90);
  assert(tyShip90 === 1288.86, `Trendyol + Yurtiçi + 90 desi → ₺${tyShip90} (PDF: 1288.86)`);
  assert(tyShip90 !== 623, "Trendyol 90 desi sentetik eski değer (623) kullanılmıyor");

  // 2. N11 + Yurtiçi + 10 desi
  const n11Ship10 = getShippingPrice("n11", "yurtici", 10);
  assert(n11Ship10 === 94.9, `N11 + Yurtiçi + 10 desi → ₺${n11Ship10}`);

  const n11Profit = calculateMarketplaceProfit({
    marketplace: "n11",
    categoryId: "n11-perde",
    salePrice: 1000,
    productCost: 300,
    vatRatePercent: 20,
    carrier: "yurtici",
    desi: 10,
    packagingCost: 0,
    adRatePercent: 0,
    campaignDiscountPercent: 0,
    extraFixedCost: 0,
  });
  assert(n11Profit.marketingServiceFee > 0, `N11 pazarlama hizmet bedeli: ₺${n11Profit.marketingServiceFee}`);
  assert(n11Profit.marketplaceServiceFee > 0, `N11 pazaryeri hizmet bedeli: ₺${n11Profit.marketplaceServiceFee}`);
  assert(
    n11Profit.netProfit < 1000 - 300 - 94.9 - n11Profit.commissionAmount,
    "N11 hizmet bedelleri net kâra yansıyor",
  );

  // 3-4. ÇiçekSepeti kargo
  const cs10 = getShippingPrice("ciceksepeti", "yurtici", 10);
  assert(cs10 === 141.32, `ÇiçekSepeti + Yurtiçi + 10 desi → ₺${cs10}`);
  const cs90 = getShippingPrice("ciceksepeti", "yurtici", 90);
  assert(cs90 === 1026.06, `ÇiçekSepeti + Yurtiçi + 90 desi → ₺${cs90}`);

  // 5. Hepsiburada Halı/Kilim %18
  const hbHali = getCommissionRate("hepsiburada", "hb-hali");
  assert(hbHali === 18, `Hepsiburada Halı & Kilim komisyon %${hbHali}`);

  // 6. Hepsiburada Yatak Odası Tekstili %18
  const hbYatak = getCommissionRate("hepsiburada", "hb-yatak-odasi");
  assert(hbYatak === 18, `Hepsiburada Yatak Odası Tekstili komisyon %${hbYatak}`);

  // 7. Komisyon olmayan kategori (ÇiçekSepeti)
  const csCommission = getCommissionEntry("ciceksepeti", "cs-hali");
  assert(csCommission === null, "ÇiçekSepeti komisyon tanımlı değil");

  const csNoComm = calculateMarketplaceProfit({
    marketplace: "ciceksepeti",
    categoryId: "cs-hali",
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
  assert(csNoComm.errors.includes("Komisyon tanımlı değil"), "ÇiçekSepeti → Komisyon tanımlı değil");

  // 8. Kargo olmayan desi
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

  // 9. Tam veri hesap
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
  assert(full.netProfit !== 0, `Net kâr: ₺${full.netProfit}`);
  assert(full.breakEvenPrice != null && full.breakEvenPrice > 0, `Başa baş: ₺${full.breakEvenPrice}`);
  assert(full.suggestedSalePrice != null && full.suggestedSalePrice > full.breakEvenPrice!, "Önerilen fiyat > başa baş");
  assert(full.commissionSource?.confidence === "official", "Kaynak confidence: official");

  // 10. Eski fake default komisyon yok
  const tyCamRate = getCommissionRate("trendyol", "ty-cam-tablo");
  assert(tyCamRate !== 21.5, `Trendyol cam tablo artık fake 21.5 değil → %${tyCamRate}`);
  assert(tyCamRate === 21.36, `Trendyol cam tablo PDF oranı %${tyCamRate}`);

  // Kategori arama
  const camSearch = searchMarketplaceCategories("cam tablo", { limit: 4 });
  assert(camSearch.length >= 2, `"cam tablo" arama → ${camSearch.length} sonuç`);
  const haliSearch = searchMarketplaceCategories("halı", { marketplace: "hepsiburada", limit: 3 });
  assert(haliSearch.some((s) => s.path.includes("Halı")), "HB halı araması");
  const perdeSearch = searchMarketplaceCategories("perde", { limit: 3 });
  assert(perdeSearch.length >= 1, "perde araması");
  const kirlentSearch = searchMarketplaceCategories("kırlent", { limit: 3 });
  assert(kirlentSearch.length >= 1, "kırlent araması");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
