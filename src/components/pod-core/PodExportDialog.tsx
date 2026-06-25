"use client";

import { useRef, useState } from "react";
import { Download, FileImage, FileText, Upload } from "lucide-react";
import {
  createProductionFile,
  documentToJsonString,
  downloadBlob,
  downloadProductionBundle,
  exportCanvasPdf,
  exportCanvasPng,
  exportCanvasSvg,
  parseDocumentJson,
} from "@/lib/pod-core/design-export-engine";
import type { ExportCropMode, ExportDpi } from "@/lib/pod-core/pod-types";
import { usePodCore } from "./pod-core-context";

export function PodExportDialog() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { engine, mockupTemplate, refresh } = usePodCore();
  const [dpi, setDpi] = useState<ExportDpi>(300);
  const [crop, setCrop] = useState<ExportCropMode>("print");
  const [busy, setBusy] = useState(false);

  const bundle = engine?.getPrintAreaBundle();

  const exportJson = () => {
    if (!engine) return;
    const doc = engine.serialize();
    const blob = new Blob([documentToJsonString(doc)], { type: "application/json" });
    downloadBlob(blob, `ena-pod-core-${Date.now()}.json`);
  };

  const importJson = async (file: File | undefined) => {
    if (!file || !engine) return;
    const text = await file.text();
    const doc = parseDocumentJson(text);
    await engine.loadDocument(doc);
    refresh();
  };

  const runExport = async (kind: "png" | "svg" | "pdf" | "production") => {
    if (!engine?.canvas || !bundle) return;
    setBusy(true);
    try {
      if (kind === "png") {
        const blob = await exportCanvasPng(engine.canvas, { crop, bundle, dpi, transparent: crop !== "full" });
        downloadBlob(blob, `ena-export-${dpi}dpi-${Date.now()}.png`);
      } else if (kind === "svg") {
        const svg = await exportCanvasSvg(engine.canvas, { crop, bundle });
        downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `ena-export-${Date.now()}.svg`);
      } else if (kind === "pdf") {
        const blob = await exportCanvasPdf(engine.canvas, { crop, bundle, dpi });
        downloadBlob(blob, `ena-export-${dpi}dpi-${Date.now()}.pdf`);
      } else {
        const files = await createProductionFile(engine.canvas, bundle, {
          dpi,
          crop,
          templateId: mockupTemplate.id,
          transparentProduction: true,
        });
        downloadProductionBundle(files);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Export</p>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="space-y-1">
          <span className="text-ena-light/60">DPI</span>
          <select
            value={dpi}
            onChange={(e) => setDpi(Number(e.target.value) as ExportDpi)}
            className="w-full rounded border border-ena-border bg-white/5 px-2 py-1"
          >
            <option value={300}>300</option>
            <option value={600}>600</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-ena-light/60">Crop</span>
          <select
            value={crop}
            onChange={(e) => setCrop(e.target.value as ExportCropMode)}
            className="w-full rounded border border-ena-border bg-white/5 px-2 py-1"
          >
            <option value="print">Print</option>
            <option value="safe">Safe</option>
            <option value="bleed">Bleed</option>
            <option value="full">Full</option>
          </select>
        </label>
      </div>

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
          disabled={busy || !bundle}
          onClick={() => void runExport("png")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-ena-border px-3 py-2 text-xs disabled:opacity-40"
        >
          <FileImage className="h-3.5 w-3.5" /> PNG ({dpi} DPI)
        </button>
        <button
          type="button"
          disabled={busy || !bundle}
          onClick={() => void runExport("svg")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-ena-border px-3 py-2 text-xs disabled:opacity-40"
        >
          <FileText className="h-3.5 w-3.5" /> SVG
        </button>
        <button
          type="button"
          disabled={busy || !bundle}
          onClick={() => void runExport("pdf")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-ena-border px-3 py-2 text-xs disabled:opacity-40"
        >
          <FileText className="h-3.5 w-3.5" /> PDF
        </button>
        <button
          type="button"
          disabled={busy || !bundle}
          onClick={() => void runExport("production")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Production Pack
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-ena-border px-3 py-2 text-xs"
        >
          <Download className="h-3.5 w-3.5" /> JSON
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-ena-border px-3 py-2 text-xs"
        >
          <Upload className="h-3.5 w-3.5" /> JSON Yükle
        </button>
      </div>
      <p className="text-[10px] text-ena-light/50">
        Production: preview.png + production.png + production.pdf + metadata.json
      </p>
    </div>
  );
}
