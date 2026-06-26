"use client";

import type { PricingCustomerType } from "@/lib/pricing-engine/pricing-types";
import {
  CUSHION_PACK4_OPTION_CODES,
  KIRLENT_PACK4_VARIANT,
  listCatalogFixedSizes,
  lookupCatalogPrice,
  POST_KESIM_OPTION_CODE,
} from "@/lib/pricing-engine/pod-price-catalog";
import {
  getPodProductProfileByTemplateId,
  listMockupTemplates,
} from "@/lib/pod-core/mockup-template-registry";
import { listPodProductProfiles } from "@/lib/pod-core/product-profiles/pod-product-profile-registry";
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
    pricing,
  } = usePodCore();

  const templates = listMockupTemplates();
  const profile = getPodProductProfileByTemplateId(mockupTemplate.id);
  const isArea = mockupTemplate.formulaHint === "AREA";
  const catalogSizes = mockupTemplate.pricingCatalogId
    ? listCatalogFixedSizes(mockupTemplate.pricingCatalogId).filter((s) => {
        if (mockupTemplate.printAreaMode === "CIRCLE") return s.variantKey === "round";
        if (mockupTemplate.pricingCatalogId === "CAM") return s.variantKey !== "round";
        if (mockupTemplate.pricingCatalogId === "KIRLENT") {
          return sizeVariantKey === KIRLENT_PACK4_VARIANT
            ? s.variantKey === KIRLENT_PACK4_VARIANT
            : !s.variantKey;
        }
        return true;
      })
    : [];
  const hasCatalogPresets = catalogSizes.length > 0;
  const postKesim = optionCodes.includes(POST_KESIM_OPTION_CODE);
  const groups = listPodProductProfiles().reduce<Record<string, typeof templates>>((acc, p) => {
    const tpl = templates.find((t) => t.id === p.templateId);
    if (!tpl) return acc;
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(tpl);
    return acc;
  }, {});

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

  const kirlentSinglePrice = lookupCatalogPrice({
    ruleCode: "CUSHION_CATALOG_V1",
    catalogId: "KIRLENT",
    widthCm: Math.round(widthCm),
    heightCm: Math.round(heightCm),
  })?.finalPrice;
  const kirlentPack4Price = lookupCatalogPrice({
    ruleCode: "CUSHION_CATALOG_V1",
    catalogId: "KIRLENT",
    widthCm: Math.round(widthCm),
    heightCm: Math.round(heightCm),
    sizeVariantKey: KIRLENT_PACK4_VARIANT,
  })?.finalPrice;

  const stripPack4Options = (codes: string[]) =>
    codes.filter(
      (c) => !CUSHION_PACK4_OPTION_CODES.some((p) => p.toLowerCase() === c.toLowerCase())
    );

  const applyPreset = (key: string) => {
    if (!key) return;
    const [dim, variant] = key.split(":");
    const [w, h] = dim.split("x").map(Number);
    if (w > 0) setWidthCm(w);
    if (h > 0) setHeightCm(h);
    setSizeVariantKey(variant || undefined);
    if (variant === KIRLENT_PACK4_VARIANT) {
      setQuantity(4);
      setOptionCodes([...stripPack4Options(optionCodes), "pack4"]);
    } else {
      setOptionCodes(stripPack4Options(optionCodes));
      setQuantity(1);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Ürün & Varyant</p>

      <label className="block space-y-1 text-xs">
        <span className="text-ena-light/60">Ürün grubu</span>
        <select
          value={mockupTemplate.id}
          onChange={(e) => {
            const tpl = templates.find((t) => t.id === e.target.value);
            if (tpl) setMockupTemplate(tpl);
          }}
          className="w-full rounded-lg border border-ena-border bg-white/5 px-2 py-2 text-xs"
        >
          {Object.entries(groups).map(([category, items]) => (
            <optgroup key={category} label={category}>
              {items.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {profile && (
        <div className="rounded-lg border border-ena-border bg-white/5 px-2 py-2 text-[10px] space-y-1 text-ena-light/70">
          <p>
            <span className="text-ena-light/50">Ürün tipi:</span> {profile.templateType}
          </p>
          <p>
            <span className="text-ena-light/50">Mockup:</span> {profile.mockupType}
          </p>
          {profile.catalogId && (
            <p>
              <span className="text-ena-light/50">Katalog:</span> {profile.catalogId}
            </p>
          )}
          {pricing && (
            <p className="text-emerald-400 font-semibold">
              Güncel fiyat: ₺{pricing.finalPrice.toLocaleString("tr-TR")}
            </p>
          )}
        </div>
      )}

      {mockupTemplate.warnings?.map((warning) => (
        <p key={warning} className="text-[10px] text-amber-400/90 rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
          {warning}
        </p>
      ))}

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

      {mockupTemplate.pricingCatalogId === "KIRLENT" && (
        <label className="block space-y-1 text-xs">
          <span className="text-ena-light/60">Kırlent paketi</span>
          <select
            value={sizeVariantKey === KIRLENT_PACK4_VARIANT ? KIRLENT_PACK4_VARIANT : "single"}
            onChange={(e) => {
              const pack4 = e.target.value === KIRLENT_PACK4_VARIANT;
              setSizeVariantKey(pack4 ? KIRLENT_PACK4_VARIANT : undefined);
              setQuantity(pack4 ? 4 : 1);
              setOptionCodes(
                pack4
                  ? [...stripPack4Options(optionCodes), "pack4"]
                  : stripPack4Options(optionCodes)
              );
            }}
            className="w-full rounded border border-ena-border bg-white/5 px-2 py-1.5"
          >
            <option value="single">
              Tekli{kirlentSinglePrice != null ? ` — ₺${kirlentSinglePrice}` : ""}
            </option>
            <option value={KIRLENT_PACK4_VARIANT}>
              4&apos;lü paket{kirlentPack4Price != null ? ` — ₺${kirlentPack4Price}` : ""}
            </option>
          </select>
        </label>
      )}

      {isArea && (
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

      {!isArea && mockupTemplate.pricingCatalogId !== "NEVRESIM" && mockupTemplate.pricingCatalogId !== "KIRLENT" && (
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

      {(profile?.options?.includes("postKesim") || mockupTemplate.pricingCatalogId === "HALI") && (
        <label className="flex items-center gap-2 text-xs text-ena-light/80">
          <input
            type="checkbox"
            checked={postKesim}
            onChange={(e) => setOptionCodes(e.target.checked ? [POST_KESIM_OPTION_CODE] : [])}
          />
          Post kesim (+₺100)
        </label>
      )}

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
