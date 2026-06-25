"use client";

import { useEffect, useState } from "react";
import { exportDesignRegionDataUrl } from "@/lib/pod-core/design-export-engine";
import { compositeMockupPreview } from "@/lib/pod-core/mockup-engine";
import { usePodCore } from "./pod-core-context";

export function PodMockupPreview() {
  const { engine, mockupTemplate, tick } = usePodCore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!engine?.canvas) return;
      const bundle = engine.getPrintAreaBundle();
      if (!bundle) return;
      setLoading(true);
      setError(null);
      try {
        const designUrl = await exportDesignRegionDataUrl(engine.canvas, bundle, "print");
        const result = await compositeMockupPreview(designUrl, mockupTemplate, {
          fit: "contain",
          opacity: 1,
          shadow: true,
          overlay: false,
        });
        if (!cancelled) setPreviewUrl(result.dataUrl);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Önizleme hatası");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(() => void run(), 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [engine, mockupTemplate, tick]);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
        Mockup · {mockupTemplate.name}
      </p>
      <div className="rounded-lg border border-ena-border bg-[#f8fafc] min-h-[160px] flex items-center justify-center overflow-hidden">
        {loading && <p className="text-xs text-ena-light/50">Güncelleniyor…</p>}
        {error && <p className="text-xs text-red-400 px-2">{error}</p>}
        {!loading && !error && previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Mockup önizleme" className="max-w-full h-auto" />
        )}
      </div>
      <p className="text-[10px] text-ena-light/50">
        {mockupTemplate.variant} · {mockupTemplate.orientation}
      </p>
    </div>
  );
}
