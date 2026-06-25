"use client";

import type { PricingCustomerType } from "@/lib/pricing-engine/pricing-types";
import {
  KIRLENT_PACK4_VARIANT,
  listCatalogFixedSizes,
  POST_KESIM_OPTION_CODE,
} from "@/lib/pricing-engine/pod-price-catalog";
import { listMockupTemplates } from "@/lib/pod-core/mockup-template-registry";
import { usePodCore } from "./pod-core-context";

export function PodVariantSelector() {
  const {
    mockupTemplate,
    setMockupTemplate,
    widthCm,
    heightCm,
    quantity,
    customerType,
    setWidthCm,
    setHeightCm,
    setQuantity,
    setCustomerType,
    sizeVariantKey,
    setSizeVariantKey,
    optionCodes,
    setOptionCodes,
  } = usePodCore();
  const templates = listMockupTemplates();
  const isArea = mockupTemplate.formulaHint === "AREA";
  const catalogSizes = mockupTemplate.pricingCatalogId
    ? listCatalogFixedSizes(mockupTemplate.pricingCatalogId)
    : [];
  const hasCatalogPresets = catalogSizes.length > 0;
  const postKesim = optionCodes.includes(POST_KESIM_OPTION_CODE);

  const presetValue = hasCatalogPresets
    ? catalogSizes.find(
        (s) =>
          s.widthCm === Math.round(widthCm) &&
          s.heightCm === Math.round(heightCm) &&
          (sizeVariantKey ? s.variantKey === sizeVariantKey : !s.variantKey)
      )
      ? `${Math.round(widthCm)}x${Math.round(heightCm)}${sizeVariantKey ? `:${sizeVariantKey}` : ""}`
      : ""
    : "";

  const applyPreset = (key: string) => {
    if (!key) return;
    const [dim, variant] = key.split(":");
    const [w, h] = dim.split("x").map(Number);
    if (w > 0) setWidthCm(w);
    if (h > 0) setHeightCm(h);
    setSizeVariantKey(variant || undefined);
    if (variant === KIRLENT_PACK4_VARIANT) setQuantity(4);
    else if (mockupTemplate.pricingCatalogId === "NEVRESIM") {
      setSizeVariantKey(variant);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Ürün & Varyant</p>

      <select
        value={mockupTemplate.id}
        onChange={(e) => {
          const tpl = templates.find((t) => t.id === e.target.value);
          if (tpl) setMockupTemplate(tpl);
        }}
        className="w-full rounded-lg border border-ena-border bg-white/5 px-2 py-2 text-xs"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.category} — {t.name}
          </option>
        ))}
      </select>

      {hasCatalogPresets && (
        <label className="block space-y-1 text-xs">
          <span className="text-ena-light/60">Hazır ebat</span>
          <select
            value={presetValue}
            onChange={(e) => applyPreset(e.target.value)}
            className="w-full rounded-lg border border-ena-border bg-white/5 px-2 py-2 text-xs"
          >
            <option value="">Özel ölçü / seçin…</option>
            {catalogSizes.map((s) => {
              const key = `${s.widthCm}x${s.heightCm}${s.variantKey ? `:${s.variantKey}` : ""}`;
              return (
                <option key={key} value={key}>
                  {s.label} — ₺{s.salePrice}
                </option>
              );
            })}
          </select>
        </label>
      )}

      <div className="rounded-lg border border-ena-border bg-white/5 px-2 py-2 text-[10px] space-y-1 text-ena-light/70">
        <p>
          <span className="text-ena-light/50">Kural:</span> {mockupTemplate.pricingRuleCode}
        </p>
        {mockupTemplate.pricingCatalogId && (
          <p>
            <span className="text-ena-light/50">Katalog:</span> {mockupTemplate.pricingCatalogId}
          </p>
        )}
        <p>
          <span className="text-ena-light/50">Malzeme:</span> {mockupTemplate.materialCode}
        </p>
      </div>

      {mockupTemplate.pricingCatalogId === "NEVRESIM" && (
        <label className="block space-y-1 text-xs">
          <span className="text-ena-light/60">Takım tipi</span>
          <select
            value={sizeVariantKey || "single"}
            onChange={(e) => setSizeVariantKey(e.target.value)}
            className="w-full rounded border border-ena-border bg-white/5 px-2 py-1.5"
          >
            <option value="single">Tek kişilik — ₺1000</option>
            <option value="double">Çift kişilik — ₺1100</option>
          </select>
        </label>
      )}

      {isArea && !hasCatalogPresets && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-ena-light/60">Genişlik (cm)</span>
            <input
              type="number"
              min={1}
              value={widthCm || ""}
              onChange={(e) => setWidthCm(Number(e.target.value))}
              className="w-full rounded border border-ena-border bg-white/5 px-2 py-1.5"
            />
          </label>
          <label className="space-y-1">
            <span className="text-ena-light/60">Yükseklik (cm)</span>
            <input
              type="number"
              min={1}
              value={heightCm || ""}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              className="w-full rounded border border-ena-border bg-white/5 px-2 py-1.5"
            />
          </label>
        </div>
      )}

      {isArea && hasCatalogPresets && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-ena-light/60">Genişlik (cm)</span>
            <input
              type="number"
              min={1}
              value={widthCm || ""}
              onChange={(e) => {
                setWidthCm(Number(e.target.value));
                setSizeVariantKey(undefined);
              }}
              className="w-full rounded border border-ena-border bg-white/5 px-2 py-1.5"
            />
          </label>
          <label className="space-y-1">
            <span className="text-ena-light/60">Yükseklik (cm)</span>
            <input
              type="number"
              min={1}
              value={heightCm || ""}
              onChange={(e) => {
                setHeightCm(Number(e.target.value));
                setSizeVariantKey(undefined);
              }}
              className="w-full rounded border border-ena-border bg-white/5 px-2 py-1.5"
            />
          </label>
        </div>
      )}

      {!isArea && mockupTemplate.pricingCatalogId !== "NEVRESIM" && (
        <label className="block space-y-1 text-xs">
          <span className="text-ena-light/60">Adet</span>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-full rounded border border-ena-border bg-white/5 px-2 py-1.5"
          />
        </label>
      )}

      {isArea && (
        <label className="block space-y-1 text-xs">
          <span className="text-ena-light/60">Adet</span>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-full rounded border border-ena-border bg-white/5 px-2 py-1.5"
          />
        </label>
      )}

      <label className="flex items-center gap-2 text-xs text-ena-light/80">
        <input
          type="checkbox"
          checked={postKesim}
          onChange={(e) =>
            setOptionCodes(e.target.checked ? [POST_KESIM_OPTION_CODE] : [])
          }
        />
        Post kesim (+₺100)
      </label>

      <label className="block space-y-1 text-xs">
        <span className="text-ena-light/60">Müşteri tipi</span>
        <select
          value={customerType}
          onChange={(e) => setCustomerType(e.target.value as PricingCustomerType)}
          className="w-full rounded border border-ena-border bg-white/5 px-2 py-1.5"
        >
          <option value="RETAIL">Perakende</option>
          <option value="DEALER">Bayi</option>
        </select>
      </label>
    </div>
  );
}
