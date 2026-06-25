"use client";

import { Loader2, Tag } from "lucide-react";
import { usePodCore } from "./pod-core-context";

function formatTry(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PodPricingPanel() {
  const {
    mockupTemplate,
    pricing,
    pricingLoading,
    pricingError,
    pricingUpdatedAt,
    customerType,
    widthCm,
    heightCm,
    quantity,
  } = usePodCore();

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
        <Tag className="h-3.5 w-3.5" /> Canlı Fiyat
      </p>

      {pricingLoading && (
        <div className="flex items-center gap-2 text-xs text-ena-light/60">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Hesaplanıyor…
        </div>
      )}

      {pricingError && (
        <p className="text-xs text-red-400 rounded-lg border border-red-500/30 bg-red-500/5 px-2 py-1.5">
          {pricingError}
        </p>
      )}

      {pricing && !pricingLoading && (
        <>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
            <p className="text-[10px] text-emerald-700/70 uppercase tracking-wide">Final Fiyat</p>
            <p className="text-2xl font-bold text-emerald-800">{formatTry(pricing.finalPrice)}</p>
            <p className="text-[10px] text-ena-light/60">
              {customerType === "DEALER" ? "Bayi" : "Perakende"} · {mockupTemplate.pricingRuleCode}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat label="Alan (m²)" value={pricing.areaM2.toFixed(3)} />
            <Stat label="Perakende" value={formatTry(pricing.retailPrice)} />
            <Stat label="Bayi" value={formatTry(pricing.dealerPrice)} />
            <Stat label="Ölçü" value={
              mockupTemplate.formulaHint === "PIECE"
                ? `${quantity} adet`
                : `${widthCm}×${heightCm} cm`
            } />
          </div>

          <div className="space-y-1 border-t border-ena-border pt-2">
            <p className="text-[10px] font-semibold text-ena-light/50 uppercase">Breakdown</p>
            <BreakdownRow label="Malzeme" amount={pricing.materialCost} />
            <BreakdownRow label="İşçilik" amount={pricing.laborCost} />
            <BreakdownRow label="Baskı" amount={pricing.printCost} />
            <BreakdownRow label="Fire" amount={pricing.wasteCost} />
            <BreakdownRow label="Komisyon" amount={pricing.commissionAmount} />
            <BreakdownRow label="KDV" amount={pricing.taxAmount} />
            {pricing.breakdown.slice(0, 4).map((line) => (
              <BreakdownRow key={line.key} label={line.label} amount={line.amount} />
            ))}
          </div>

          {pricingUpdatedAt && (
            <p className="text-[10px] text-ena-light/40">
              {new Date(pricingUpdatedAt).toLocaleTimeString("tr-TR")} · {pricing.calculationTimeMs}ms
            </p>
          )}
        </>
      )}

      {!pricing && !pricingLoading && !pricingError && (
        <p className="text-xs text-ena-light/50">Ölçü girin — fiyat otomatik hesaplanır</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ena-border px-2 py-1.5">
      <p className="text-[10px] text-ena-light/50">{label}</p>
      <p className="font-medium text-ena-text">{value}</p>
    </div>
  );
}

function BreakdownRow({ label, amount }: { label: string; amount: number }) {
  if (!amount) return null;
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-ena-light/70">{label}</span>
      <span className="font-mono text-ena-text">{formatTry(amount)}</span>
    </div>
  );
}
