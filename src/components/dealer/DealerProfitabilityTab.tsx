"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Search, Store, Truck } from "lucide-react";
import type { AnalysisWorkspaceConfig } from "@/lib/analysis/workspace-config";
import type { AnalysisFeedQuality, AnalysisProductSource } from "@/lib/analysis/types";
import {
  findEnaSlugFromText,
  listMarketplaceLabels,
  resolveDefaultCategoryId,
} from "@/lib/marketplace-intelligence/marketplace-category-cache";
import { searchMarketplaceCategories } from "@/lib/marketplace-intelligence/marketplace-category-search";
import { calculateMarketplaceProfit } from "@/lib/marketplace-intelligence/marketplace-profit-engine";
import { listCarriersForMarketplace } from "@/lib/marketplace-intelligence/marketplace-shipping-cache";
import type { CategorySearchResult, MarketplaceId, ShippingCarrierId } from "@/lib/marketplace-intelligence/marketplace-types";

type AnalysisProduct = {
  id: string;
  source?: AnalysisProductSource;
  sourceLabel?: string;
  name: string;
  category: string | null;
  price: number;
  costPrice: number | null;
  vatRate: number | null;
  shippingCost: number | null;
  feedQuality?: AnalysisFeedQuality;
};

type DealerProfitabilityTabProps = {
  config: AnalysisWorkspaceConfig;
  products: AnalysisProduct[];
  onMarginChange?: (margin: number | null) => void;
};

function asMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function DealerProfitabilityTab({
  config,
  products,
  onMarginChange,
}: DealerProfitabilityTabProps) {
  const marketplaces = listMarketplaceLabels();

  const [marketplace, setMarketplace] = useState<MarketplaceId | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categorySuggestions, setCategorySuggestions] = useState<CategorySearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [salePrice, setSalePrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [vatRate, setVatRate] = useState("20");
  const [carrier, setCarrier] = useState<ShippingCarrierId | "">("");
  const [desi, setDesi] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [adRate, setAdRate] = useState("");
  const [campaignRate, setCampaignRate] = useState("");
  const [extraFixedCost, setExtraFixedCost] = useState("");
  const [targetMargin, setTargetMargin] = useState("22");

  const [selectedProductId, setSelectedProductId] = useState("");

  const carriers = useMemo(
    () => (marketplace ? listCarriersForMarketplace(marketplace) : []),
    [marketplace],
  );

  const selectedCategory = useMemo(() => {
    if (!categoryId) return null;
    return categorySuggestions.find((s) => s.categoryId === categoryId) || null;
  }, [categoryId, categorySuggestions]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  useEffect(() => {
    if (!marketplace) {
      setCarrier("");
      return;
    }
    if (!carriers.some((c) => c.id === carrier)) {
      setCarrier(carriers[0]?.id || "");
    }
  }, [marketplace, carriers, carrier]);

  useEffect(() => {
    const q = categoryQuery.trim();
    if (q.length < 2) {
      setCategorySuggestions([]);
      return;
    }
    setCategorySuggestions(
      searchMarketplaceCategories(q, { marketplace: marketplace || undefined, limit: 10 }),
    );
  }, [categoryQuery, marketplace]);

  const result = useMemo(() => {
    return calculateMarketplaceProfit({
      marketplace,
      categoryId,
      salePrice: Number(salePrice) || 0,
      productCost: Number(productCost) || 0,
      vatRatePercent: Number(vatRate) || 0,
      carrier,
      desi: Number(desi) || 0,
      packagingCost: Number(packagingCost) || 0,
      adRatePercent: Number(adRate) || 0,
      campaignDiscountPercent: Number(campaignRate) || 0,
      extraFixedCost: Number(extraFixedCost) || 0,
      targetMarginPercent: Number(targetMargin) || 22,
    });
  }, [
    marketplace,
    categoryId,
    salePrice,
    productCost,
    vatRate,
    carrier,
    desi,
    packagingCost,
    adRate,
    campaignRate,
    extraFixedCost,
    targetMargin,
  ]);

  useEffect(() => {
    onMarginChange?.(result.ready ? result.profitMarginPercent : null);
  }, [result.ready, result.profitMarginPercent, onMarginChange]);

  function applyProductToForm(product: AnalysisProduct) {
    setSelectedProductId(product.id);
    if (product.price > 0) setSalePrice(String(product.price));
    if (product.costPrice != null && product.costPrice > 0) setProductCost(String(product.costPrice));
    if (product.vatRate != null) setVatRate(String(product.vatRate));

    const slug = findEnaSlugFromText(product.category || product.name);
    if (slug && marketplace) {
      const defaultCat = resolveDefaultCategoryId(marketplace, slug);
      if (defaultCat) {
        setCategoryId(defaultCat);
        const suggestions = searchMarketplaceCategories(slug.replace("-", " "), {
          marketplace,
          limit: 1,
        });
        if (suggestions[0]) {
          setCategoryQuery(`${suggestions[0].name} — ${suggestions[0].path}`);
        }
      }
    } else if (product.category) {
      setCategoryQuery(product.category);
      const suggestions = searchMarketplaceCategories(product.category, {
        marketplace: marketplace || undefined,
        limit: 5,
      });
      if (suggestions[0]) {
        setCategoryId(suggestions[0].categoryId);
        setCategoryQuery(`${suggestions[0].name} — ${suggestions[0].path}`);
      }
    }
  }

  function selectCategorySuggestion(item: CategorySearchResult) {
    setMarketplace(item.marketplace);
    setCategoryId(item.categoryId);
    setCategoryQuery(`${item.name} — ${item.path}`);
    setShowSuggestions(false);
  }

  const hasBlockingErrors = result.errors.length > 0;
  const canShowProfit = result.ready && !hasBlockingErrors;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-nexa-border bg-nexa-card p-5">
          <h2 className="text-lg font-semibold text-nexa-text">Kârlılık Hesabı</h2>
          <p className="mt-1 text-sm text-nexa-text-secondary">
            Kategori, komisyon ve kargo verileri cache tabanlıdır. Eksik veri varsa tahmini rakam gösterilmez.
          </p>

          <div className="mt-5 rounded-2xl border border-nexa-border/80 bg-nexa-bg p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <label className="flex-1 space-y-1.5">
                <span className="text-xs font-medium text-nexa-text-secondary">{config.productPickerLabel}</span>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-xl border border-nexa-border bg-nexa-card px-3 py-2 text-sm text-nexa-text focus:outline-none"
                >
                  <option value="">Ürün seç</option>
                  {products.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sourceLabel ? `[${item.sourceLabel}] ` : ""}
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => selectedProduct && applyProductToForm(selectedProduct)}
                disabled={!selectedProduct}
                className="rounded-xl border border-nexa-primary/30 bg-nexa-primary/10 px-4 py-2 text-sm font-medium text-nexa-primary transition hover:bg-nexa-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {config.productPickerButton}
              </button>
            </div>
            <p className="mt-2 text-xs text-nexa-text-secondary">{config.productPickerHelp}</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-nexa-text-secondary">Pazaryeri</span>
              <select
                value={marketplace}
                onChange={(e) => {
                  setMarketplace(e.target.value as MarketplaceId);
                  setCategoryId("");
                  setCategoryQuery("");
                }}
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"
              >
                <option value="">Seçin</option>
                {marketplaces.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="relative space-y-1.5 md:col-span-2">
              <span className="text-xs font-medium text-nexa-text-secondary">Kategori ara / seç</span>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-nexa-text-secondary" />
                <input
                  value={categoryQuery}
                  onChange={(e) => {
                    setCategoryQuery(e.target.value);
                    setShowSuggestions(true);
                    if (!e.target.value.trim()) setCategoryId("");
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder='Örn: "cam tablo", "halı", "perde", "kırlent"'
                  className="w-full rounded-xl border border-nexa-border bg-nexa-bg py-2 pl-9 pr-3 text-sm text-nexa-text focus:outline-none"
                />
              </div>
              {showSuggestions && categorySuggestions.length > 0 ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-nexa-border bg-nexa-card shadow-xl">
                  {categorySuggestions.map((item) => (
                    <button
                      key={item.categoryId}
                      type="button"
                      onClick={() => selectCategorySuggestion(item)}
                      className="block w-full border-b border-nexa-border/60 px-3 py-2 text-left text-sm hover:bg-nexa-bg"
                    >
                      <span className="font-medium text-nexa-text">{item.name}</span>
                      <span className="mt-0.5 block text-[11px] text-nexa-text-secondary">
                        {item.marketplaceLabel} · {item.path}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-nexa-text-secondary">Satış fiyatı (TL)</span>
              <input
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Örn: 799"
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-nexa-text-secondary">Ürün maliyeti (TL)</span>
              <input
                value={productCost}
                onChange={(e) => setProductCost(e.target.value)}
                placeholder="Maliyet girin"
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-nexa-text-secondary">KDV oranı %</span>
              <input
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-nexa-text-secondary">Kargo firması</span>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value as ShippingCarrierId)}
                disabled={!marketplace}
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none disabled:opacity-50"
              >
                <option value="">Seçin</option>
                {carriers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-nexa-text-secondary">Desi / KG</span>
              <input
                value={desi}
                onChange={(e) => setDesi(e.target.value)}
                placeholder="Örn: 10"
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-nexa-text-secondary">Paketleme maliyeti (TL)</span>
              <input
                value={packagingCost}
                onChange={(e) => setPackagingCost(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-nexa-text-secondary">Reklam gideri %</span>
              <input
                value={adRate}
                onChange={(e) => setAdRate(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-nexa-text-secondary">Kampanya indirimi %</span>
              <input
                value={campaignRate}
                onChange={(e) => setCampaignRate(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-nexa-text-secondary">Ek sabit gider (TL)</span>
              <input
                value={extraFixedCost}
                onChange={(e) => setExtraFixedCost(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-nexa-text-secondary">Hedef marj % (öneri fiyat)</span>
              <input
                value={targetMargin}
                onChange={(e) => setTargetMargin(e.target.value)}
                className="w-full rounded-xl border border-nexa-border bg-nexa-bg px-3 py-2 text-sm text-nexa-text focus:outline-none"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {hasBlockingErrors ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-200">Hesap için eksik veri</p>
                <ul className="mt-2 space-y-1 text-xs text-amber-100/90">
                  {result.errors.map((err) => (
                    <li key={err}>• {err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-[32px] border border-nexa-border bg-[#0f1218] p-4 shadow-2xl">
          <div className="rounded-[28px] border border-white/10 bg-[#11161f] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">
                  {marketplace ? marketplaces.find((m) => m.id === marketplace)?.label : "Pazaryeri seçilmedi"}
                </p>
                <p className="text-lg font-semibold text-white">
                  {result.categoryLabel || selectedCategory?.name || "Kategori seçilmedi"}
                </p>
              </div>
              {canShowProfit && result.riskLabel ? (
                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    result.riskLabel === "Sağlıklı"
                      ? "bg-emerald-500/12 text-emerald-300"
                      : result.riskLabel === "Orta risk"
                        ? "bg-amber-500/12 text-amber-300"
                        : "bg-rose-500/12 text-rose-300"
                  }`}
                >
                  {result.riskLabel}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl bg-white p-4 text-slate-900">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Store size={24} className="text-slate-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {selectedProduct?.name || result.categoryLabel || "Ürün / kategori seçin"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedProduct?.sourceLabel || "Cache tabanlı kârlılık önizlemesi"}
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {canShowProfit ? asMoney(Number(salePrice)) : "—"}
                  </p>
                </div>
              </div>

              {canShowProfit ? (
                <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3 text-xs">
                  <div className="flex justify-between">
                    <span>Komisyon (%{result.commissionRatePercent})</span>
                    <span>{asMoney(result.commissionAmount)}</span>
                  </div>
                  {result.marketingServiceFee > 0 ? (
                    <div className="flex justify-between">
                      <span>Pazarlama hizmet bedeli</span>
                      <span>{asMoney(result.marketingServiceFee)}</span>
                    </div>
                  ) : null}
                  {result.marketplaceServiceFee > 0 ? (
                    <div className="flex justify-between">
                      <span>Pazaryeri hizmet bedeli</span>
                      <span>{asMoney(result.marketplaceServiceFee)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span>
                      <Truck size={12} className="mr-1 inline" />
                      Kargo ({result.carrierLabel}, {desi} desi)
                    </span>
                    <span>{result.shippingAmount != null ? asMoney(result.shippingAmount) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>KDV</span>
                    <span>{asMoney(result.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reklam</span>
                    <span>{asMoney(result.adAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kampanya indirimi</span>
                    <span>{asMoney(result.campaignDiscountAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paketleme + ek gider + maliyet</span>
                    <span>
                      {asMoney(result.packagingCost + result.extraFixedCost + result.productCost)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                    <span>Net kâr</span>
                    <span className={result.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      {asMoney(result.netProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Kâr marjı</span>
                    <span>%{result.profitMarginPercent.toFixed(1)}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  Tüm zorunlu alanlar doldurulduğunda net kâr hesaplanır.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-nexa-border bg-nexa-card p-4">
            <p className="text-xs uppercase tracking-wide text-nexa-text-secondary">Önerilen satış fiyatı</p>
            <p className="mt-2 text-3xl font-semibold text-nexa-primary">
              {canShowProfit && result.suggestedSalePrice != null
                ? asMoney(result.suggestedSalePrice)
                : "—"}
            </p>
            <p className="mt-2 text-xs text-nexa-text-secondary">
              Hedef marj %{targetMargin || "22"} için cache komisyon + kargo ile hesaplanır.
            </p>
          </div>
          <div className="rounded-2xl border border-nexa-border bg-nexa-card p-4">
            <p className="text-xs uppercase tracking-wide text-nexa-text-secondary">Başa baş fiyat</p>
            <p className="mt-2 text-3xl font-semibold text-nexa-text">
              {canShowProfit && result.breakEvenPrice != null ? asMoney(result.breakEvenPrice) : "—"}
            </p>
          </div>
          {canShowProfit ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
              <CheckCircle2 size={14} />
              Hesap gerçek kaynak verisiyle tamamlandı.
            </div>
          ) : null}
          {(result.commissionSource || result.shippingSource) ? (
            <div className="rounded-2xl border border-nexa-border/60 bg-nexa-bg/50 px-4 py-3 text-[11px] text-nexa-text-secondary space-y-1">
              {result.commissionSource ? (
                <p>
                  Kaynak: {result.commissionSource.sourceName}
                  {result.commissionSource.effectiveDate ? ` (${result.commissionSource.effectiveDate})` : ""}
                  {" · "}KDV: {result.commissionSource.vatIncluded ? "dahil" : "hariç"}
                  {result.dataConfidence === "estimated" ? " · tahmini" : ""}
                </p>
              ) : null}
              {result.shippingSource ? (
                <p>
                  Kargo: {result.shippingSource.sourceName}
                  {result.shippingSource.effectiveDate ? ` ${result.shippingSource.effectiveDate}` : ""}
                  {" · "}KDV: {result.shippingSource.vatIncluded ? "dahil" : "hariç"}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
