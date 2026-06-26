"use client";

import { Loader2 } from "lucide-react";
import { usePodCore } from "@/components/pod-core/pod-core-context";
import { isSystemObject } from "@/lib/pod-core/print-area-overlay";
import { POD_CORE_DEFAULTS } from "@/lib/pod-core/pod-types";

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
    pointerCoords,
    tick,
  } = usePodCore();

  const objectCount = engine?.canvas?.getObjects().filter((o) => !isSystemObject(o)).length ?? 0;
  const vp = engine?.getViewport();
  const bundle = engine?.getPrintAreaBundle();
  const dpi = bundle?.dpi ?? POD_CORE_DEFAULTS.defaultDpi;

  const canvasLabel =
    mockupTemplate.formulaHint === "AREA"
      ? `${widthCm}×${heightCm} cm`
      : `${mockupTemplate.width}×${mockupTemplate.height} px`;

  return (
    <footer
      className="h-7 shrink-0 border-t border-white/5 bg-[#0f1117] flex items-center px-2 sm:px-3 gap-2 sm:gap-3 text-[10px] text-white/35 font-mono overflow-x-auto"
      key={tick}
    >
      <span className="shrink-0">Canvas {canvasLabel}</span>
      <span className="text-white/15">|</span>
      <span className="shrink-0">{dpi} DPI</span>
      <span className="text-white/15 hidden sm:inline">|</span>
      <span className="shrink-0 hidden sm:inline">Print {bundle ? "✓" : "—"}</span>
      <span className="text-white/15 hidden md:inline">|</span>
      <span className="shrink-0 hidden md:inline">Safe {engine?.getOverlayVisibility().safe ? "✓" : "—"}</span>
      <span className="text-white/15 hidden md:inline">|</span>
      <span className="shrink-0 hidden md:inline">Bleed {engine?.getOverlayVisibility().bleed ? "✓" : "—"}</span>
      <span className="text-white/15 hidden lg:inline">|</span>
      <span className="shrink-0 hidden lg:inline">Zoom {((vp?.zoom ?? 1) * 100).toFixed(0)}%</span>
      <span className="text-white/15 hidden xl:inline">|</span>
      <span className="shrink-0 hidden xl:inline">
        X{pointerCoords?.x ?? "—"} Y{pointerCoords?.y ?? "—"}
      </span>
      <span className="text-white/15">|</span>
      <span className="shrink-0">{objectCount} katman</span>
      <span className="text-white/15 hidden sm:inline">|</span>
      <span className="shrink-0 hidden sm:inline">{quantity} adet</span>
      {projectId && (
        <>
          <span className="text-white/15">|</span>
          <span className="truncate max-w-[72px] shrink-0">{projectId.slice(0, 8)}</span>
        </>
      )}
      <div className="flex-1" />
      {pricingLoading && (
        <span className="inline-flex items-center gap-1 text-emerald-500/70 shrink-0">
          <Loader2 className="h-3 w-3 animate-spin" /> Fiyat
        </span>
      )}
      {pricingError && <span className="text-red-400 shrink-0">{pricingError}</span>}
      {pricing && !pricingLoading && (
        <span className="text-emerald-400/80 shrink-0 tabular-nums">
          {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(pricing.finalPrice)}
        </span>
      )}
    </footer>
  );
}
