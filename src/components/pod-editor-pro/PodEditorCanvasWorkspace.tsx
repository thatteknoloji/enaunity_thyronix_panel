"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Type } from "lucide-react";
import { isSystemObject } from "@/lib/pod-core/print-area-overlay";
import { usePodCore } from "@/components/pod-core/pod-core-context";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export function PodEditorCanvasWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const { engine, refresh, mockupTemplate, widthCm, heightCm, tick } = usePodCore();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !engine) return;
    engine.mount(el);
    refresh();
  }, [engine, refresh]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!engine?.canvas) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        void engine.undo();
      } else if ((mod && e.key.toLowerCase() === "y") || (mod && e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        void engine.redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        engine.deleteSelection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [engine]);

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      if (!ACCEPTED.includes(file.type)) {
        setUploadError("Yalnızca PNG, JPG veya WebP yükleyebilirsiniz.");
        return;
      }
      if (!engine) return;
      try {
        await engine.addImageFromFile(file);
        refresh();
      } catch {
        setUploadError("Görsel yüklenemedi. Dosyayı kontrol edin.");
      }
    },
    [engine, refresh]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const objectCount =
    engine?.canvas?.getObjects().filter((o) => !isSystemObject(o)).length ?? 0;
  const vp = engine?.getViewport();
  const isEmpty = objectCount === 0;

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#1a1d24] relative">
      {/* Cetvel hissi */}
      <div className="h-6 shrink-0 border-b border-white/5 bg-[#14161b] flex items-end px-8">
        <div className="flex-1 h-3 border-l border-white/10 relative">
          <span className="absolute left-2 -top-0.5 text-[9px] text-white/25 font-mono">0</span>
          <span className="absolute right-4 -top-0.5 text-[9px] text-white/25 font-mono">
            {mockupTemplate.formulaHint === "AREA" ? `${widthCm} cm` : mockupTemplate.name}
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-6 shrink-0 border-r border-white/5 bg-[#14161b]" />
        <div
          ref={dropRef}
          className={`flex-1 relative overflow-auto flex items-center justify-center p-8 transition-colors ${
            dragOver ? "bg-emerald-500/5" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div
            className="relative rounded-lg shadow-2xl shadow-black/40 ring-1 ring-white/10"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #e8ecf0 25%, transparent 25%), linear-gradient(-45deg, #e8ecf0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e8ecf0 75%), linear-gradient(-45deg, transparent 75%, #e8ecf0 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
              backgroundColor: "#f1f5f9",
            }}
          >
            <canvas ref={canvasRef} className="block" />
            {isEmpty && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3 bg-white/60 backdrop-blur-[1px]">
                <div className="rounded-full bg-white/90 p-4 shadow-sm ring-1 ring-slate-200">
                  <ImagePlus className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">Görsel yükle veya yazı ekle</p>
                <p className="text-xs text-slate-400 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <ImagePlus className="h-3 w-3" /> Sürükle-bırak
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Type className="h-3 w-3" /> Sol panelden metin
                  </span>
                </p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-500/90 text-white text-xs px-4 py-2 shadow-lg">
              {uploadError}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-3 left-10 text-[10px] text-white/30 font-mono" key={tick}>
        Zoom {((vp?.zoom ?? 1) * 100).toFixed(0)}% · {mockupTemplate.name}
      </div>
    </div>
  );
}
