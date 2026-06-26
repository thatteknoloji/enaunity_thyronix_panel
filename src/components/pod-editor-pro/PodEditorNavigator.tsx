"use client";

import { useEffect, useRef } from "react";
import { usePodCore } from "@/components/pod-core/pod-core-context";

/** Sağ alt köşe mini canvas önizlemesi */
export function PodEditorNavigator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { engine, tick } = usePodCore();

  useEffect(() => {
    const nav = canvasRef.current;
    const source = engine?.canvas;
    if (!nav || !source) return;

    const ctx = nav.getContext("2d");
    if (!ctx) return;

    const w = 120;
    const h = 90;
    nav.width = w;
    nav.height = h;

    const dataUrl = source.toDataURL({ format: "png", multiplier: 0.15 });
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#1a1d24";
      ctx.fillRect(0, 0, w, h);
      const scale = Math.min(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      ctx.strokeStyle = "rgba(52, 211, 153, 0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect((w - dw) / 2, (h - dh) / 2, dw, dh);
    };
    img.src = dataUrl;
  }, [engine, tick]);

  return (
    <div className="absolute bottom-4 right-4 z-20 rounded-lg border border-white/10 bg-[#0f1117]/90 p-1 shadow-xl backdrop-blur-sm">
      <p className="text-[8px] text-white/40 px-1 pb-0.5 uppercase tracking-wider">Navigator</p>
      <canvas ref={canvasRef} className="block rounded" width={120} height={90} />
    </div>
  );
}
