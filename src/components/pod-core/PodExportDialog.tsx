"use client";

import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { documentToJsonString, parseDocumentJson } from "@/lib/pod-core/design-export-engine";
import { usePodCore } from "./pod-core-context";

export function PodExportDialog() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { engine, refresh } = usePodCore();

  const exportJson = () => {
    if (!engine) return;
    const doc = engine.serialize();
    const blob = new Blob([documentToJsonString(doc)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ena-pod-core-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File | undefined) => {
    if (!file || !engine) return;
    const text = await file.text();
    const doc = parseDocumentJson(text);
    await engine.loadDocument(doc);
    refresh();
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Belge (JSON)</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => void importJson(e.target.files?.[0])}
      />
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={exportJson}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-ena-border px-3 py-2 text-xs hover:border-emerald-500/40"
        >
          <Download className="h-3.5 w-3.5" /> JSON İndir
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-ena-border px-3 py-2 text-xs hover:border-emerald-500/40"
        >
          <Upload className="h-3.5 w-3.5" /> JSON Yükle
        </button>
      </div>
      <p className="text-[10px] text-ena-light/50">PNG/SVG/PDF — Faz 2</p>
    </div>
  );
}
