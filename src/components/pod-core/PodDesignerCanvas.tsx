"use client";

import { useEffect, useRef } from "react";
import { usePodCore } from "./pod-core-context";

export function PodDesignerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { engine, refresh } = usePodCore();

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !engine) return;
    engine.mount(el);
    refresh();
    // Engine lifecycle PodCoreProvider'da yönetilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!engine?.canvas) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        void engine.undo();
        return;
      }
      if ((mod && e.key.toLowerCase() === "y") || (mod && e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        void engine.redo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        engine.deleteSelection();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [engine]);

  const vp = engine?.getViewport();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[10px] text-ena-light/60 px-1">
        <span>ENA POD Core Canvas</span>
        <span>
          Zoom {(vp?.zoom ?? 1).toFixed(2)} · Pan {Math.round(vp?.panX ?? 0)},{Math.round(vp?.panY ?? 0)}
        </span>
      </div>
      <div className="rounded-xl border border-ena-border bg-[#f8fafc] overflow-hidden shadow-inner">
        <canvas ref={canvasRef} className="block max-w-full" />
      </div>
    </div>
  );
}
