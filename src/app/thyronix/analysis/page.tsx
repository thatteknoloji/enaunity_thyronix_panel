"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  LineChart,
  PackageSearch,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import {
  findMarketplacePreset,
  THYRONIX_CARGO_PRESETS,
  THYRONIX_MARKETPLACE_PRESETS,
  type ThyronixAnalysisCategoryPreset,
  type ThyronixAnalysisCargoPreset,
  type ThyronixAnalysisMarketplacePreset,
} from "@/lib/thyronix/analysis-presets";

type TabKey = "profit" | "product" | "competitor";

type AnalysisProduct = {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  stockCode: string | null;
  modelCode: string | null;
  price: number;
  costPrice: number | null;
  stock: number;
  image: string | null;
  images: string | null;
  imageCount: number;
  vatRate: number | null;
  shippingCost: number | null;
  deliveryTime: string | null;
};

const tabs = [
  { id: "profit", label: "Kârlılık", icon: CircleDollarSign },
  { id: "product", label: "Ürün Analizi", icon: PackageSearch },
  { id: "competitor", label: "Rakip Analizi", icon: ScanSearch },
] satisfies Array<{ id: TabKey; label: string; icon: typeof CircleDollarSign }>;

function asMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function findBestCategoryMatch(
  categories: ThyronixAnalysisCategoryPreset[],
  rawCategory?: string | null,
) {
  const haystack = (rawCategory || "").toLocaleLowerCase("tr-TR");
  if (!haystack) {
    return categories[0]?.value || "genel";
  }

  const directMatch = categories.find((item) => {
    const label = item.label.toLocaleLowerCase("tr-TR");
    return haystack.includes(item.value) || haystack.includes(label);
  });

  if (directMatch) {
    return directMatch.value;
  }

  if (haystack.includes("cam")) {
    return categories.find((item) => item.value === "cam-tablo")?.value || categories[0]?.value || "genel";
  }

  if (haystack.includes("mdf")) {
    return categories.find((item) => item.value === "mdf-tablo")?.value || categories[0]?.value || "genel";
  }

  if (haystack.includes("dekor")) {
    return categories.find((item) => item.value === "dekor")?.value || categories[0]?.value || "genel";
  }

  return categories[0]?.value || "genel";
}

export default function ThyronixAnalysisPage() {
  const [tab, setTab] = useState<TabKey>("profit");
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [marketplaces, setMarketplaces] = useState<ThyronixAnalysisMarketplacePreset[]>(THYRONIX_MARKETPLACE_PRESETS);
  const [cargoes, setCargoes] = useState<ThyronixAnalysisCargoPreset[]>(THYRONIX_CARGO_PRESETS);
  const [products, setProducts] = useState<AnalysisProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");

  const [marketplace, setMarketplace] = useState("trendyol");
  const [category, setCategory] = useState("cam-tablo");
  const [cost, setCost] = useState("250");
  const [vatRate, setVatRate] = useState("20");
  const [selectedCargo, setSelectedCargo] = useState(THYRONIX_CARGO_PRESETS[0]?.value || "yurtici");
  const [shippingFee, setShippingFee] = useState("89");
  const [packagingFee, setPackagingFee] = useState("18");
  const [extraFixedFee, setExtraFixedFee] = useState("5");
  const [paymentFeeRate, setPaymentFeeRate] = useState("3.25");
  const [adRate, setAdRate] = useState("7");
  const [campaignRate, setCampaignRate] = useState("4");
  const [targetProfitTl, setTargetProfitTl] = useState("140");
  const [targetMarginRate, setTargetMarginRate] = useState("22");
  const [manualPrice, setManualPrice] = useState("799");

  const [productTitle, setProductTitle] = useState("25x35 Cam Tablo Atatürk Portresi UV Baskı");
  const [productDescription, setProductDescription] = useState("Yüksek çözünürlüklü UV baskı, şık cam yüzey, hediye paketi seçeneği.");
  const [productBrand, setProductBrand] = useState("Esranın Dünyası");
  const [productBarcode, setProductBarcode] = useState("8690000000001");
  const [productImages, setProductImages] = useState("5");
  const [productAttributes, setProductAttributes] = useState("ölçü, materyal, tema, baskı tipi");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [competitorStoreName, setCompetitorStoreName] = useState("Örnek Rakip Mağaza");
  const [competitorProductCount, setCompetitorProductCount] = useState("240");
  const [competitorBestSellerCount, setCompetitorBestSellerCount] = useState("18");
  const [competitorReviewScore, setCompetitorReviewScore] = useState("4.7");
  const [competitorReviewCount, setCompetitorReviewCount] = useState("1280");
  const [competitorMinPrice, setCompetitorMinPrice] = useState("449");
  const [competitorMaxPrice, setCompetitorMaxPrice] = useState("1199");
  const [competitorShippingDays, setCompetitorShippingDays] = useState("2");
  const [competitorCampaignRate, setCompetitorCampaignRate] = useState("12");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalysisData() {
      try {
        setLoadingData(true);
        setDataError(null);

        const response = await fetch("/api/thyronix/analysis", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || "Analiz verileri alınamadı.");
        }

        if (cancelled) {
          return;
        }

        const nextMarketplaces = Array.isArray(payload.data?.marketplaces) && payload.data.marketplaces.length > 0
          ? payload.data.marketplaces
          : THYRONIX_MARKETPLACE_PRESETS;
        const nextCargoes = Array.isArray(payload.data?.cargoes) && payload.data.cargoes.length > 0
          ? payload.data.cargoes
          : THYRONIX_CARGO_PRESETS;
        const nextProducts = Array.isArray(payload.data?.products) ? payload.data.products : [];

        setMarketplaces(nextMarketplaces);
        setCargoes(nextCargoes);
        setProducts(nextProducts);
        setMarketplace((current) => current || nextMarketplaces[0]?.value || "trendyol");
        setSelectedCargo((current) => current || nextCargoes[0]?.value || "yurtici");
      } catch (error) {
        if (!cancelled) {
          setDataError(error instanceof Error ? error.message : "Analiz verileri yüklenemedi.");
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    void loadAnalysisData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const nextMarketplace =
      marketplaces.find((item) => item.value === marketplace) ||
      findMarketplacePreset(marketplace);

    if (!nextMarketplace.categories.some((item) => item.value === category)) {
      setCategory(nextMarketplace.categories[0]?.value || "genel");
    }
  }, [category, marketplace, marketplaces]);

  useEffect(() => {
    const cargo = cargoes.find((item) => item.value === selectedCargo);
    if (cargo) {
      setShippingFee(String(cargo.fee));
    }
  }, [cargoes, selectedCargo]);

  const currentMarketplace =
    marketplaces.find((item) => item.value === marketplace) ||
    findMarketplacePreset(marketplace);
  const currentCategory =
    currentMarketplace.categories.find((item) => item.value === category) ||
    currentMarketplace.categories[0] || {
      value: "genel",
      label: "Genel",
      commission: 0,
    };
  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  const commissionRate = currentCategory.commission;

  function applyProductToForms(product: AnalysisProduct) {
    setSelectedProductId(product.id);
    setProductTitle(product.name || "");
    setProductDescription(product.description || "");
    setProductBrand(product.brand || "");
    setProductBarcode(product.barcode || "");
    setProductImages(String(product.imageCount || 0));
    setProductAttributes(
      [product.category, product.brand, product.modelCode, product.stock > 0 ? "stokta" : "stok kontrol"]
        .filter(Boolean)
        .join(", "),
    );
    setCost(String(product.costPrice ?? product.price ?? 0));
    setManualPrice(String(product.price ?? 0));
    setVatRate(String(product.vatRate ?? 20));
    if (typeof product.shippingCost === "number" && Number.isFinite(product.shippingCost)) {
      setShippingFee(String(product.shippingCost));
    }
    setCategory(findBestCategoryMatch(currentMarketplace.categories, product.category));
  }

  const profitCalc = useMemo(() => {
    const numericCost = Number(cost) || 0;
    const numericVat = Number(vatRate) || 0;
    const numericShipping = Number(shippingFee) || 0;
    const numericPackaging = Number(packagingFee) || 0;
    const numericExtraFixed = Number(extraFixedFee) || 0;
    const numericPaymentRate = Number(paymentFeeRate) || 0;
    const numericAdRate = Number(adRate) || 0;
    const numericCampaignRate = Number(campaignRate) || 0;
    const numericTargetProfit = Number(targetProfitTl) || 0;
    const numericTargetMargin = Number(targetMarginRate) || 0;
    const numericManualPrice = Number(manualPrice) || 0;

    const variableRate = (commissionRate + numericPaymentRate + numericAdRate + numericCampaignRate) / 100;
    const fixedCost = numericCost + numericShipping + numericPackaging + numericExtraFixed;
    const suggestedByProfit = variableRate >= 1 ? 0 : (fixedCost + numericTargetProfit) / (1 - variableRate);
    const suggestedByMargin = variableRate >= 1 || numericTargetMargin >= 100
      ? 0
      : fixedCost / (1 - variableRate - numericTargetMargin / 100);
    const suggestedPrice = Math.max(suggestedByProfit, suggestedByMargin);

    const commissionAmount = numericManualPrice * (commissionRate / 100);
    const paymentAmount = numericManualPrice * (numericPaymentRate / 100);
    const adAmount = numericManualPrice * (numericAdRate / 100);
    const campaignAmount = numericManualPrice * (numericCampaignRate / 100);
    const vatAmount = numericManualPrice - numericManualPrice / (1 + numericVat / 100);
    const totalExpense = fixedCost + commissionAmount + paymentAmount + adAmount + campaignAmount;
    const profit = numericManualPrice - totalExpense;
    const margin = numericManualPrice > 0 ? (profit / numericManualPrice) * 100 : 0;
    const breakEven = variableRate >= 1 ? 0 : fixedCost / (1 - variableRate);
    const minSafe = variableRate >= 1 ? 0 : (fixedCost + 35) / (1 - variableRate);

    return {
      fixedCost,
      commissionAmount,
      paymentAmount,
      adAmount,
      campaignAmount,
      vatAmount,
      totalExpense,
      profit,
      margin,
      breakEven,
      minSafe,
      suggestedByProfit,
      suggestedByMargin,
      suggestedPrice,
    };
  }, [cost, vatRate, shippingFee, packagingFee, extraFixedFee, paymentFeeRate, adRate, campaignRate, targetProfitTl, targetMarginRate, manualPrice, commissionRate]);

  const productScore = useMemo(() => {
    const titleLen = productTitle.trim().length;
    const descLen = productDescription.trim().length;
    const imageCount = Number(productImages) || 0;
    const attrCount = productAttributes.split(",").map((item) => item.trim()).filter(Boolean).length;

    const titleScore = clamp((titleLen / 70) * 25, 0, 25);
    const descScore = clamp((descLen / 220) * 25, 0, 25);
    const imageScore = clamp((imageCount / 6) * 20, 0, 20);
    const idScore = (productBrand.trim() ? 8 : 0) + (productBarcode.trim() ? 12 : 0);
    const attrScore = clamp((attrCount / 6) * 10, 0, 10);

    const total = Math.round(titleScore + descScore + imageScore + idScore + attrScore);
    const risks = [
      titleLen < 45 ? "Başlık kısa, pazaryeri aramalarında zayıf kalabilir." : null,
      descLen < 120 ? "Açıklama yetersiz, dönüşüm oranı düşebilir." : null,
      imageCount < 4 ? "Görsel sayısı düşük, güven hissi azalır." : null,
      !productBarcode.trim() ? "Barkod eksik, eşleştirme ve yayın sorunları çıkabilir." : null,
      attrCount < 3 ? "Varyant/özellik alanı zayıf, kategori beslemesi eksik kalabilir." : null,
    ].filter(Boolean) as string[];

    const strengths = [
      titleLen >= 55 ? "Başlık uzunluğu güçlü." : null,
      descLen >= 180 ? "Açıklama doluluk seviyesi iyi." : null,
      imageCount >= 5 ? "Görsel zenginliği yeterli." : null,
      productBarcode.trim() ? "Kimlik alanı hazır." : null,
      attrCount >= 4 ? "Özellik seti güçlü." : null,
    ].filter(Boolean) as string[];

    return { total, risks, strengths };
  }, [productTitle, productDescription, productBrand, productBarcode, productImages, productAttributes]);

  const competitorInsights = useMemo(() => {
    const totalProducts = Number(competitorProductCount) || 0;
    const bestSellers = Number(competitorBestSellerCount) || 0;
    const reviewScore = Number(competitorReviewScore) || 0;
    const reviewCount = Number(competitorReviewCount) || 0;
    const minPrice = Number(competitorMinPrice) || 0;
    const maxPrice = Number(competitorMaxPrice) || 0;
    const shippingDays = Number(competitorShippingDays) || 0;
    const campaignPressure = Number(competitorCampaignRate) || 0;
    const manual = Number(manualPrice) || 0;
    const priceSpan = Math.max(0, maxPrice - minPrice);
    const bestsellerRatio = totalProducts > 0 ? (bestSellers / totalProducts) * 100 : 0;

    const opportunities = [
      manual > 0 && minPrice > 0 && manual < minPrice
        ? "Fiyatın rakibin en alt bandının altında, marjı ezmeden premium anlatı ile yukarı çıkabilirsin."
        : null,
      shippingDays >= 3 ? "Rakibin teslimatı yavaş. Hızlı kargo vaadini öne çekmek dönüşüm avantajı sağlar." : null,
      reviewScore < 4.5 ? "Rakip yorum puanı kırılgan. Ürün görseli ve açıklama kalitesi ile güven avantajı alabilirsin." : null,
      bestsellerRatio < 8 ? "Rakipte satış birkaç üründe yoğunlaşmıyor; doğru başlık optimizasyonu ile vitrine girmek daha kolay olabilir." : null,
    ].filter(Boolean) as string[];

    const warnings = [
      campaignPressure >= 20 ? "Rakip ağır kampanya baskısında çalışıyor, aynı banda inmeden önce minimum kabul fiyatını koru." : null,
      reviewCount >= 3000 ? "Rakipte güçlü sosyal kanıt var; aynı kategoride agresif giriş için ekstra reklam bütçesi gerekebilir." : null,
      priceSpan <= 150 ? "Rakibin fiyat bandı çok dar. Yanlış fiyatlama hızlı görünür hale gelir." : null,
    ].filter(Boolean) as string[];

    return {
      totalProducts,
      bestSellers,
      reviewScore,
      reviewCount,
      minPrice,
      maxPrice,
      shippingDays,
      campaignPressure,
      priceSpan,
      bestsellerRatio,
      opportunities,
      warnings,
    };
  }, [
    competitorBestSellerCount,
    competitorCampaignRate,
    competitorMaxPrice,
    competitorMinPrice,
    competitorProductCount,
    competitorReviewCount,
    competitorReviewScore,
    competitorShippingDays,
    manualPrice,
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-nexa-border bg-nexa-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-nexa-primary/20 bg-nexa-primary/10 px-3 py-1 text-xs font-medium text-nexa-primary">
              <Sparkles size={14} />
              THYRONIX Analiz Merkezi
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-nexa-text">Rakip, ürün ve kârlılık kararlarını tek merkezde topla</h1>
            <p className="mt-2 max-w-3xl text-sm text-nexa-text-secondary">
              Bu fazda kârlılık motorunu çalışır şekilde açtım. Ürün analizi de hazır. Rakip analizi ise veri toplayıcı katmana bağlanacak şekilde hazırlanmış durumda.
            </p>
            {dataError ? (
              <p className="mt-3 text-xs text-amber-400">
                Canlı analiz verisi alınamadı, güvenli presetlerle devam ediyoruz: {dataError}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-nexa-border px-4 py-3">
              <p className="text-xl font-semibold text-nexa-text">{products.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-nexa-text-secondary">Hazır Ürün</p>
            </div>
            <div className="rounded-xl border border-nexa-border px-4 py-3">
              <p className="text-xl font-semibold text-nexa-primary">%{Math.max(0, Math.round(profitCalc.margin))}</p>
              <p className="text-[10px] uppercase tracking-wide text-nexa-text-secondary">Anlık Marj</p>
            </div>
            <div className="rounded-xl border border-nexa-border px-4 py-3">
              <p className="text-xl font-semibold text-nexa-warning">{productScore.total}/100</p>
              <p className="text-[10px] uppercase tracking-wide text-nexa-text-secondary">Ürün Skoru</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-nexa-border">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === item.id
                ? "border-nexa-primary text-nexa-primary"
                : "border-transparent text-nexa-text-secondary hover:text-nexa-text"
            }`}
          >
            <item.icon size={15} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "profit" && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-nexa-border bg-nexa-card p-5">
              <h2 className="text-lg font-semibold text-nexa-text">Veri Girişi</h2>
              <p className="mt-1 text-sm text-nexa-text-secondary">Kategori, komisyon, kargo ve hedef kârı gir. Motor satış fiyatını ve güvenli bandı hesaplasın.</p>

              <div className="mt-5 rounded-2xl border border-nexa-border/80 bg-nexa-bg p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <label className="flex-1 space-y-1.5">
                    <span className="text-xs font-medium text-nexa-text-secondary">THYRONIX ürününden doldur</span>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full rounded-xl border border-nexa-border bg-nexa-card px-3 py-2 text-sm text-nexa-text focus:outline-none"
                    >
                      <option value="">Ürün seç</option>
                      {products.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedProduct) {
                        applyProductToForms(selectedProduct);
                      }
                    }}
                    disabled={!selectedProduct}
                    className="rounded-xl border border-nexa-primary/30 bg-nexa-primary/10 px-4 py-2 text-sm font-medium text-nexa-primary transition hover:bg-nexa-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Ürünü forma işle
                  </button>
                </div>
                <p className="mt-2 text-xs text-nexa-text-secondary">
                  Son 40 ürün içinden maliyet, satış fiyatı ve içerik alanlarını tek tıkla bu motora taşı.
                </p>
                {selectedProduct ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-nexa-text-secondary">
                    <span className="rounded-full border border-nexa-border px-2.5 py-1">
                      Barkod: {selectedProduct.barcode || "Yok"}
                    </span>
                    <span className="rounded-full border border-nexa-border px-2.5 py-1">
                      Model: {selectedProduct.modelCode || "Yok"}
                    </span>
                    <span className="rounded-full border border-nexa-border px-2.5 py-1">
                      Stok Kodu: {selectedProduct.stockCode || "Yok"}
                    </span>
                    <span className="rounded-full border border-nexa-border px-2.5 py-1">
                      Kaynak KDV: %{selectedProduct.vatRate ?? 20}
                    </span>
                    <span className="rounded-full border border-nexa-border px-2.5 py-1">
                      Kaynak Kargo: {asMoney(selectedProduct.shippingCost ?? 0)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Pazaryeri</span>
                  <select value={marketplace} onChange={(e) => {
                    const next = e.target.value;
                    setMarketplace(next);
                    const nextMarket = marketplaces.find((item) => item.value === next) || findMarketplacePreset(next);
                    setCategory(nextMarket?.categories[0]?.value || "genel");
                  }} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none">
                    {marketplaces.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Kategori</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none">
                    {currentMarketplace.categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Ürün maliyeti</span>
                  <input value={cost} onChange={(e) => setCost(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">KDV oranı</span>
                  <input value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Kargo firması</span>
                  <select
                    value={selectedCargo}
                    onChange={(e) => setSelectedCargo(e.target.value)}
                    className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"
                  >
                    {cargoes.map((item) => <option key={item.value} value={item.value}>{item.label} - {asMoney(item.fee)}</option>)}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Paketleme</span>
                  <input value={packagingFee} onChange={(e) => setPackagingFee(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Ödeme komisyonu %</span>
                  <input value={paymentFeeRate} onChange={(e) => setPaymentFeeRate(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Reklam gideri %</span>
                  <input value={adRate} onChange={(e) => setAdRate(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Kampanya indirimi %</span>
                  <input value={campaignRate} onChange={(e) => setCampaignRate(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Ek sabit gider</span>
                  <input value={extraFixedFee} onChange={(e) => setExtraFixedFee(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-nexa-border bg-nexa-card p-5">
              <h2 className="text-lg font-semibold text-nexa-text">Hedefler</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Hedef kâr (TL)</span>
                  <input value={targetProfitTl} onChange={(e) => setTargetProfitTl(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Hedef marj %</span>
                  <input value={targetMarginRate} onChange={(e) => setTargetMarginRate(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Test satış fiyatı</span>
                  <input value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-nexa-border bg-[#0f1218] p-4 shadow-2xl">
              <div className="rounded-[28px] border border-white/10 bg-[#11161f] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/45">{currentMarketplace.label}</p>
                    <p className="text-lg font-semibold text-white">{currentCategory.label}</p>
                  </div>
                  <div className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-medium text-emerald-300">
                    {profitCalc.margin >= Number(targetMarginRate) ? "Hedefte" : "İzle"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 text-slate-900">
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <Store size={24} className="text-slate-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{productTitle || currentCategory.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{selectedProduct?.brand || productBrand || "Mağaza kartı önizlemesi"}</p>
                      <p className="mt-2 text-2xl font-bold">{asMoney(Number(manualPrice) || 0)}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3 text-xs">
                    <div className="flex items-center justify-between"><span>Komisyon</span><span>{asMoney(profitCalc.commissionAmount)}</span></div>
                    <div className="flex items-center justify-between"><span>Ödeme gideri</span><span>{asMoney(profitCalc.paymentAmount)}</span></div>
                    <div className="flex items-center justify-between"><span>Reklam</span><span>{asMoney(profitCalc.adAmount)}</span></div>
                    <div className="flex items-center justify-between"><span>Kampanya</span><span>{asMoney(profitCalc.campaignAmount)}</span></div>
                    <div className="flex items-center justify-between"><span>Kargo + paket</span><span>{asMoney(Number(shippingFee) + Number(packagingFee) + Number(extraFixedFee))}</span></div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-semibold"><span>Tahmini kâr</span><span className={profitCalc.profit >= 0 ? "text-emerald-600" : "text-rose-600"}>{asMoney(profitCalc.profit)}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-nexa-border bg-nexa-card p-4">
                <p className="text-xs uppercase tracking-wide text-nexa-text-secondary">Önerilen satış fiyatı</p>
                <p className="mt-2 text-3xl font-semibold text-nexa-primary">{asMoney(profitCalc.suggestedPrice)}</p>
                <p className="mt-2 text-xs text-nexa-text-secondary">Hedef kâr ve marjı aynı anda tutturmak için güvenli üst değer.</p>
              </div>
              <div className="rounded-2xl border border-nexa-border bg-nexa-card p-4">
                <p className="text-xs uppercase tracking-wide text-nexa-text-secondary">Başa baş fiyat</p>
                <p className="mt-2 text-3xl font-semibold text-nexa-text">{asMoney(profitCalc.breakEven)}</p>
                <p className="mt-2 text-xs text-nexa-text-secondary">Bu seviyenin altı zarar bölgesi.</p>
              </div>
              <div className="rounded-2xl border border-nexa-border bg-nexa-card p-4">
                <p className="text-xs uppercase tracking-wide text-nexa-text-secondary">Minimum kabul fiyatı</p>
                <p className="mt-2 text-3xl font-semibold text-nexa-warning">{asMoney(profitCalc.minSafe)}</p>
                <p className="mt-2 text-xs text-nexa-text-secondary">Kampanya baskısında aşağı inmeden önce bu eşiği koru.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "product" && (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-nexa-border bg-nexa-card p-5">
            <h2 className="text-lg font-semibold text-nexa-text">Ürün Besleme Analizi</h2>
            <p className="mt-1 text-sm text-nexa-text-secondary">Başlık, açıklama, görsel ve kimlik alanına göre ürünün pazaryeriye çıkma hazırlığını puanlar.</p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-nexa-border/80 bg-nexa-bg p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <label className="flex-1 space-y-1.5">
                    <span className="text-xs font-medium text-nexa-text-secondary">THYRONIX ürün seç</span>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full rounded-xl border border-nexa-border bg-nexa-card px-3 py-2 text-sm text-nexa-text focus:outline-none"
                    >
                      <option value="">Ürün seç</option>
                      {products.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedProduct) {
                        applyProductToForms(selectedProduct);
                      }
                    }}
                    disabled={!selectedProduct}
                    className="rounded-xl border border-nexa-primary/30 bg-nexa-primary/10 px-4 py-2 text-sm font-medium text-nexa-primary transition hover:bg-nexa-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Analize taşı
                  </button>
                </div>
                <p className="mt-2 text-xs text-nexa-text-secondary">
                  Görsel sayısı, başlık ve açıklama uzunluğu en son THYRONIX ürün verisiyle otomatik dolabilir.
                </p>
                {selectedProduct ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-nexa-text-secondary">
                    <span className="rounded-full border border-nexa-border px-2.5 py-1">
                      Kategori: {selectedProduct.category || "Yok"}
                    </span>
                    <span className="rounded-full border border-nexa-border px-2.5 py-1">
                      Stok: {selectedProduct.stock}
                    </span>
                    <span className="rounded-full border border-nexa-border px-2.5 py-1">
                      Teslimat: {selectedProduct.deliveryTime || "Belirtilmemiş"}
                    </span>
                  </div>
                ) : null}
              </div>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-nexa-text-secondary">Başlık</span>
                <input value={productTitle} onChange={(e) => setProductTitle(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-nexa-text-secondary">Açıklama</span>
                <textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} rows={5} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Marka</span>
                  <input value={productBrand} onChange={(e) => setProductBrand(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Barkod</span>
                  <input value={productBarcode} onChange={(e) => setProductBarcode(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Görsel adedi</span>
                  <input value={productImages} onChange={(e) => setProductImages(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Özellikler</span>
                  <input value={productAttributes} onChange={(e) => setProductAttributes(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-nexa-border bg-nexa-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-nexa-text-secondary">Hazırlık Skoru</p>
                  <p className="mt-2 text-4xl font-semibold text-nexa-text">{productScore.total}/100</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                  productScore.total >= 80 ? "bg-emerald-500/10 text-emerald-400" :
                  productScore.total >= 60 ? "bg-amber-500/10 text-amber-400" :
                  "bg-rose-500/10 text-rose-400"
                }`}>
                  {productScore.total >= 80 ? "Yayına Hazır" : productScore.total >= 60 ? "İyileştir" : "Zayıf"}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl bg-nexa-bg p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-nexa-text"><CheckCircle2 size={16} className="text-emerald-400" /> Güçlü Alanlar</div>
                  <div className="mt-3 space-y-2 text-sm text-nexa-text-secondary">
                    {productScore.strengths.length > 0 ? productScore.strengths.map((item) => <p key={item}>{item}</p>) : <p>Henüz öne çıkan güç bulunmadı.</p>}
                  </div>
                </div>
                <div className="rounded-xl bg-nexa-bg p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-nexa-text"><AlertTriangle size={16} className="text-amber-400" /> Riskler</div>
                  <div className="mt-3 space-y-2 text-sm text-nexa-text-secondary">
                    {productScore.risks.length > 0 ? productScore.risks.map((item) => <p key={item}>{item}</p>) : <p>Şu an kritik risk görünmüyor.</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-nexa-border bg-nexa-card p-5">
              <h3 className="text-base font-semibold text-nexa-text">Besleme Sağlık Kartı</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-nexa-border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-nexa-text"><BarChart3 size={15} /> Başlık</div>
                  <p className="mt-2 text-xs text-nexa-text-secondary">{productTitle.length} karakter</p>
                </div>
                <div className="rounded-xl border border-nexa-border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-nexa-text"><Boxes size={15} /> Açıklama</div>
                  <p className="mt-2 text-xs text-nexa-text-secondary">{productDescription.length} karakter</p>
                </div>
                <div className="rounded-xl border border-nexa-border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-nexa-text"><Camera size={15} /> Görseller</div>
                  <p className="mt-2 text-xs text-nexa-text-secondary">{productImages} adet</p>
                </div>
                <div className="rounded-xl border border-nexa-border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-nexa-text"><ShieldCheck size={15} /> Kimlik</div>
                  <p className="mt-2 text-xs text-nexa-text-secondary">{productBarcode ? "Hazır" : "Eksik"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "competitor" && (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-nexa-border bg-nexa-card p-5">
            <h2 className="text-lg font-semibold text-nexa-text">Rakip Analizi Hazırlık Katmanı</h2>
            <p className="mt-1 text-sm text-nexa-text-secondary">Bu fazda ekranı ve veri sözleşmesini açtım. Tarayıcı connector/pazaryeri okuyucu bağlandığında gerçek tarama aynı yapıya düşecek.</p>

            <div className="mt-5 space-y-4">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-nexa-text-secondary">Rakip mağaza linki</span>
                <input
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  placeholder="https://www.trendyol.com/magaza/..."
                  className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-nexa-text-secondary">Pazaryeri</span>
                <select className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none">
                  {marketplaces.map((item) => <option key={item.value}>{item.label}</option>)}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Mağaza adı</span>
                  <input value={competitorStoreName} onChange={(e) => setCompetitorStoreName(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Toplam ürün</span>
                  <input value={competitorProductCount} onChange={(e) => setCompetitorProductCount(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Çok satan ürün sayısı</span>
                  <input value={competitorBestSellerCount} onChange={(e) => setCompetitorBestSellerCount(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Yorum puanı</span>
                  <input value={competitorReviewScore} onChange={(e) => setCompetitorReviewScore(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Toplam yorum</span>
                  <input value={competitorReviewCount} onChange={(e) => setCompetitorReviewCount(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Teslimat süresi (gün)</span>
                  <input value={competitorShippingDays} onChange={(e) => setCompetitorShippingDays(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Minimum fiyat</span>
                  <input value={competitorMinPrice} onChange={(e) => setCompetitorMinPrice(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-nexa-text-secondary">Maksimum fiyat</span>
                  <input value={competitorMaxPrice} onChange={(e) => setCompetitorMaxPrice(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-nexa-text-secondary">Kampanya baskısı %</span>
                  <input value={competitorCampaignRate} onChange={(e) => setCompetitorCampaignRate(e.target.value)} className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none" />
                </label>
              </div>

              <div className="rounded-xl border border-dashed border-nexa-border p-4 text-sm text-nexa-text-secondary">
                Gerçek tarama bağlanınca bu alanlar otomatik dolacak. Şu an veri sözleşmesi ve karar katmanı hazır; sonraki fazda connector yalnızca bu kutuları canlı veriyle besleyecek.
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-nexa-border bg-nexa-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-nexa-text-secondary">Rakip Özeti</p>
                  <p className="mt-2 text-2xl font-semibold text-nexa-text">{competitorStoreName}</p>
                  <p className="mt-1 text-sm text-nexa-text-secondary">
                    {competitorUrl ? competitorUrl : "Link eklendiğinde connector bu alanı mağaza ismiyle otomatik eşleştirecek."}
                  </p>
                </div>
                <div className="rounded-full border border-nexa-border px-3 py-1 text-xs font-medium text-nexa-primary">
                  Fiyat bandı: {asMoney(competitorInsights.minPrice)} - {asMoney(competitorInsights.maxPrice)}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-nexa-bg p-4">
                  <p className="text-xs uppercase tracking-wide text-nexa-text-secondary">Toplam Ürün</p>
                  <p className="mt-2 text-2xl font-semibold text-nexa-text">{competitorInsights.totalProducts}</p>
                </div>
                <div className="rounded-xl bg-nexa-bg p-4">
                  <p className="text-xs uppercase tracking-wide text-nexa-text-secondary">Çok Satan Oranı</p>
                  <p className="mt-2 text-2xl font-semibold text-nexa-text">%{Math.round(competitorInsights.bestsellerRatio)}</p>
                </div>
                <div className="rounded-xl bg-nexa-bg p-4">
                  <p className="text-xs uppercase tracking-wide text-nexa-text-secondary">Yorum Gücü</p>
                  <p className="mt-2 text-2xl font-semibold text-nexa-text">{competitorInsights.reviewScore.toFixed(1)}</p>
                </div>
                <div className="rounded-xl bg-nexa-bg p-4">
                  <p className="text-xs uppercase tracking-wide text-nexa-text-secondary">Teslimat</p>
                  <p className="mt-2 text-2xl font-semibold text-nexa-text">{competitorInsights.shippingDays} gün</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-nexa-border bg-nexa-card p-5">
            <h3 className="text-base font-semibold text-nexa-text">Bağlanacak veri başlıkları</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                { icon: Store, title: "Mağaza Özeti", desc: "Toplam ürün, takipçi/yorum, aktif kategori dağılımı" },
                { icon: LineChart, title: "Satış Basıncı", desc: "Çok satan ürünler, fiyat kümeleri, düşük fiyat penetrasyonu" },
                { icon: Truck, title: "Operasyon", desc: "Teslimat süresi, kargo vaatleri, kampanya yoğunluğu" },
                { icon: PackageSearch, title: "Ürün Derinliği", desc: "En çok tekrar eden başlık kalıpları, görsel tipi, açıklama yapısı" },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-nexa-border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-nexa-text"><item.icon size={15} /> {item.title}</div>
                  <p className="mt-2 text-xs leading-5 text-nexa-text-secondary">{item.desc}</p>
                </div>
              ))}
            </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl bg-nexa-bg p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-nexa-text">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    Fırsat Alanları
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-nexa-text-secondary">
                    {competitorInsights.opportunities.length > 0 ? (
                      competitorInsights.opportunities.map((item) => <p key={item}>{item}</p>)
                    ) : (
                      <p>Şu an güçlü fırsat sinyali görünmüyor.</p>
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-nexa-bg p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-nexa-text">
                    <AlertTriangle size={16} className="text-amber-400" />
                    Baskı / Risk
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-nexa-text-secondary">
                    {competitorInsights.warnings.length > 0 ? (
                      competitorInsights.warnings.map((item) => <p key={item}>{item}</p>)
                    ) : (
                      <p>Şu an kritik baskı görünmüyor.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-nexa-primary/20 bg-nexa-primary/10 px-3 py-1 text-xs font-medium text-nexa-primary">
                {loadingData ? "THYRONIX ürünleri yükleniyor" : `${products.length} ürün bağlandı, sıradaki faz connector`}
                <ArrowRight size={13} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
