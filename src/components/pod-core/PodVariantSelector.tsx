"use client";

import type { PricingCustomerType } from "@/lib/pricing-engine/pricing-types";
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
  } = usePodCore();
  const templates = listMockupTemplates();
  const isArea = mockupTemplate.formulaHint === "AREA";

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

      <div className="rounded-lg border border-ena-border bg-white/5 px-2 py-2 text-[10px] space-y-1 text-ena-light/70">
        <p>
          <span className="text-ena-light/50">Kural:</span> {mockupTemplate.pricingRuleCode}
        </p>
        <p>
          <span className="text-ena-light/50">Malzeme:</span> {mockupTemplate.materialCode}
        </p>
        <p>
          <span className="text-ena-light/50">Varyant:</span> {mockupTemplate.variantId}
        </p>
      </div>

      {isArea ? (
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
      ) : (
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
