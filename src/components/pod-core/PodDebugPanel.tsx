"use client";

import { useMemo } from "react";
import { buildLayerList } from "@/lib/pod-core/layer-engine";
import { documentToJsonString } from "@/lib/pod-core/design-export-engine";
import { POD_CORE_VERSION } from "@/lib/pod-core/pod-types";
import { usePodCore } from "./pod-core-context";

export function PodDebugPanel() {
  const { engine, tick, selectedObjectIds, mockupTemplate } = usePodCore();

  const debug = useMemo(() => {
    const bundle = engine?.getPrintAreaBundle();
    const layers = buildLayerList(engine?.canvas ?? null);
    const doc = engine?.serialize();
    const json = doc ? documentToJsonString(doc) : "";
    const mem = typeof performance !== "undefined" && "memory" in performance
      ? (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize
      : undefined;

    return {
      version: POD_CORE_VERSION,
      canvasJsonLength: json.length,
      printArea: bundle?.printable,
      safeArea: bundle?.safe,
      bleedArea: bundle?.bleed,
      dpi: bundle?.dpi ?? 300,
      exportWidth: bundle ? Math.round(bundle.printable.width * (bundle.dpi / 96)) : 0,
      exportHeight: bundle ? Math.round(bundle.printable.height * (bundle.dpi / 96)) : 0,
      layerCount: layers.length,
      historyCount: engine?.history.timeline.length ?? 0,
      memoryMb: mem ? (mem / 1024 / 1024).toFixed(1) : "n/a",
      selectedObjectIds,
      templateId: mockupTemplate.id,
    };
  }, [engine, tick, selectedObjectIds, mockupTemplate.id]);

  return (
    <div className="space-y-3 text-xs font-mono" key={tick}>
      <Row k="version" v={debug.version} />
      <Row k="template" v={debug.templateId} />
      <Row k="layers" v={String(debug.layerCount)} />
      <Row k="history" v={String(debug.historyCount)} />
      <Row k="dpi" v={String(debug.dpi)} />
      <Row k="export px" v={`${debug.exportWidth}×${debug.exportHeight}`} />
      <Row k="json bytes" v={String(debug.canvasJsonLength)} />
      <Row k="memory MB" v={debug.memoryMb} />
      <Row k="selection" v={debug.selectedObjectIds.join(", ") || "—"} />
      <details className="rounded border border-ena-border p-2">
        <summary className="cursor-pointer text-ena-light/70">Print Area JSON</summary>
        <pre className="mt-2 max-h-40 overflow-auto text-[10px] text-ena-light/60 whitespace-pre-wrap">
          {JSON.stringify({ printable: debug.printArea, safe: debug.safeArea, bleed: debug.bleedArea }, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ena-border/50 pb-1">
      <span className="text-ena-light/50">{k}</span>
      <span className="text-ena-text truncate">{v}</span>
    </div>
  );
}
