"use client";

import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import { usePodCore } from "./pod-core-context";

export function PodUploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { engine, refresh } = usePodCore();

  const onFile = async (file: File | undefined) => {
    if (!file || !engine) return;
    if (!file.type.startsWith("image/")) return;
    await engine.addImageFromFile(file);
    refresh();
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Görsel Yükle</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 px-3 py-4 text-xs text-emerald-700 hover:bg-emerald-500/10"
      >
        <ImagePlus className="h-4 w-4" />
        PNG / JPG / WebP
      </button>
      <p className="text-[10px] text-ena-light/50">V1: yerel dosya → canvas. Cloud sonraki faz.</p>
    </div>
  );
}
