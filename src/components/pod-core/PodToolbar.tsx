"use client";

import {
  Circle,
  Hand,
  MousePointer2,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { usePodCore } from "./pod-core-context";
import type { PodCoreTool } from "@/lib/pod-core/pod-types";

const TOOLS: { id: PodCoreTool; label: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Seç", icon: MousePointer2 },
  { id: "pan", label: "Pan", icon: Hand },
  { id: "rect", label: "Kare", icon: Square },
  { id: "circle", label: "Daire", icon: Circle },
  { id: "text", label: "Metin", icon: Type },
];

export function PodToolbar() {
  const { engine, tick, refresh } = usePodCore();
  const activeTool = engine?.getActiveTool() ?? "select";
  const canUndo = engine?.history.canUndo ?? false;
  const canRedo = engine?.history.canRedo ?? false;

  const setTool = (tool: PodCoreTool) => {
    engine?.setTool(tool);
    if (tool === "rect") engine?.addRect();
    if (tool === "circle") engine?.addCircle();
    if (tool === "text") engine?.addText();
    engine?.setTool("select");
    refresh();
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Araçlar</p>
      <div className="grid grid-cols-3 gap-1.5">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => setTool(id)}
            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] transition ${
              activeTool === id
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                : "border-ena-border bg-white/5 text-ena-light hover:border-emerald-500/40"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={!canUndo}
          onClick={() => void engine?.undo()}
          className="inline-flex items-center gap-1 rounded-lg border border-ena-border px-2 py-1.5 text-xs disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" /> Geri
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={() => void engine?.redo()}
          className="inline-flex items-center gap-1 rounded-lg border border-ena-border px-2 py-1.5 text-xs disabled:opacity-40"
        >
          <Redo2 className="h-3.5 w-3.5" /> İleri
        </button>
        <button
          type="button"
          onClick={() => {
            engine?.deleteSelection();
            refresh();
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1.5 text-xs text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" /> Sil
        </button>
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            engine?.zoomOut();
            refresh();
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-ena-border px-2 py-1.5 text-xs"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            engine?.resetView();
            refresh();
          }}
          className="rounded-lg border border-ena-border px-2 py-1.5 text-xs min-w-[3rem] text-center"
        >
          {((engine?.getViewport().zoom ?? 1) * 100).toFixed(0)}%
        </button>
        <button
          type="button"
          onClick={() => {
            engine?.zoomIn();
            refresh();
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-ena-border px-2 py-1.5 text-xs"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-[10px] text-ena-light/50" key={tick}>
        Ctrl+Z / Ctrl+Y · Delete
      </p>
    </div>
  );
}
