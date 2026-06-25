"use client";

import {
  AlignCenter,
  Circle,
  Grid3X3,
  ImagePlus,
  Layers,
  Magnet,
  MousePointer2,
  Square,
  Trash2,
  Type,
} from "lucide-react";
import { snapObjectToCanvasCenter } from "@/lib/pod-core/alignment-engine";
import { getSelectedObjects } from "@/lib/pod-core/selection-engine";
import { usePodCore } from "@/components/pod-core/pod-core-context";
import type { PodCoreTool } from "@/lib/pod-core/pod-types";
import { useRef, useState } from "react";

type ToolId = PodCoreTool | "upload" | "layers" | "align" | "grid";

const TOOLS: { id: ToolId; label: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Seç", icon: MousePointer2 },
  { id: "upload", label: "Görsel", icon: ImagePlus },
  { id: "text", label: "Yazı", icon: Type },
  { id: "rect", label: "Şekil", icon: Square },
  { id: "circle", label: "Daire", icon: Circle },
  { id: "layers", label: "Katman", icon: Layers },
  { id: "align", label: "Hizala", icon: AlignCenter },
  { id: "grid", label: "Grid", icon: Grid3X3 },
];

type Props = {
  onFocusPanel: (tab: "layers" | "product") => void;
};

export function PodEditorToolRail({ onFocusPanel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { engine, refresh } = usePodCore();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const activeTool = engine?.getActiveTool() ?? "select";
  const gridOn = engine?.getOverlayVisibility().grid ?? false;

  const setTool = (tool: PodCoreTool) => {
    engine?.setTool(tool);
    refresh();
  };

  const onToolClick = (id: ToolId) => {
    setUploadError(null);
    if (id === "upload") {
      inputRef.current?.click();
      return;
    }
    if (id === "layers") {
      onFocusPanel("layers");
      return;
    }
    if (id === "align") {
      const objs = getSelectedObjects(engine?.canvas ?? null);
      if (objs[0]) snapObjectToCanvasCenter(engine?.canvas ?? null, objs[0]);
      refresh();
      return;
    }
    if (id === "grid") {
      const vis = engine?.getOverlayVisibility();
      engine?.setOverlayVisibility({ grid: !vis?.grid });
      refresh();
      return;
    }
    if (id === "rect") {
      setTool("rect");
      engine?.addRect();
      engine?.setTool("select");
      refresh();
      return;
    }
    if (id === "circle") {
      setTool("circle");
      engine?.addCircle();
      engine?.setTool("select");
      refresh();
      return;
    }
    if (id === "text") {
      setTool("text");
      engine?.addText();
      engine?.setTool("select");
      refresh();
      return;
    }
    setTool(id);
  };

  const onFile = async (file: File | undefined) => {
    if (!file || !engine) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setUploadError("PNG / JPG / WebP");
      return;
    }
    try {
      await engine.addImageFromFile(file);
      refresh();
    } catch {
      setUploadError("Yükleme hatası");
    }
  };

  return (
    <aside className="w-14 shrink-0 border-r border-white/5 bg-[#12141a] flex flex-col items-center py-3 gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {TOOLS.map(({ id, label, icon: Icon }) => {
        const active =
          id === "grid" ? gridOn : id === activeTool || (id === "rect" && activeTool === "rect");
        return (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => onToolClick(id)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              active
                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                : "text-white/50 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}

      <div className="flex-1" />

      <button
        type="button"
        title="Snap (merkez)"
        onClick={() => onToolClick("align")}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white/40 hover:text-emerald-400 hover:bg-white/5"
      >
        <Magnet className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Sil"
        onClick={() => {
          engine?.deleteSelection();
          refresh();
        }}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 mb-1"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {uploadError && (
        <p className="text-[8px] text-red-400 px-1 text-center leading-tight">{uploadError}</p>
      )}
    </aside>
  );
}
