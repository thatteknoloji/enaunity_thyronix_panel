"use client";

import { Loader2 } from "lucide-react";
import { usePodCore } from "@/components/pod-core/pod-core-context";
import { isSystemObject } from "@/lib/pod-core/print-area-overlay";

export function PodEditorStatusBar() {
  const {
    engine,
    mockupTemplate,
    widthCm,
    heightCm,
    quantity,
    pricing,
    pricingLoading,
    pricingError,
    projectId,
    tick,
  } = usePodCore();

  const objectCount =
    engine?.canvas?.getObjects().filter((o) => !isSystemObject(o)).length ?? 0;
  const vp = engine?.getViewport();

  const sizeLabel =
    mockupTemplate.formulaHint === "AREA"
      ? `${widthCm}×${heightCm} cm · ${quantity} adet`
      : `${quantity} adet`;

  return (
    <footer className="h-7 shrink-0 border-t border-white/5 bg-[#0f1117] flex items-center px-3 gap-4 text-[10px] text-white/35 font-mono" key={tick}>
      <span>POD Editor Pro</span>
      <span className="text-white/20">|</span>
      <span>{mockupTemplate.pricingRuleCode}</span>
      <span className="text-white/20">|</span>
      <span>{sizeLabel}</span>
      <span className="text-white/20">|</span>
      <span>{objectCount} nesne</span>
      <span className="text-white/20">|</span>
      <span>Zoom {(vp?.zoom ?? 1).toFixed(2)}</span>
      {projectId && (
        <>
          <span className="text-white/20">|</span>
          <span className="truncate max-w-[100px]">{projectId.slice(0, 8)}…</span>
        </>
      )}
      <div className="flex-1" />
      {pricingLoading && (
        <span className="inline-flex items-center gap-1 text-emerald-500/70">
          <Loader2 className="h-3 w-3 animate-spin" /> Fiyat…
        </span>
      )}
      {pricingError && <span className="text-red-400">{pricingError}</span>}
      {pricing && !pricingLoading && (
        <span className="text-emerald-400/80">
          Final {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(pricing.finalPrice)}
        </span>
      )}
    </footer>
  );
}
