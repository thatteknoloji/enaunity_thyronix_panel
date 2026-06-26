"use client";

import { Shadow, type FabricObject } from "fabric";
import { getSelectedObjects } from "@/lib/pod-core/selection-engine";
import { kindFromFabricType } from "@/lib/pod-core/pod-types";
import { usePodCore } from "@/components/pod-core/pod-core-context";
import { PodEditorObjectProperties } from "./PodEditorObjectProperties";
import { FlipHorizontal, FlipVertical, Lock, Unlock } from "lucide-react";

const FONTS = ["Inter", "Georgia", "Arial", "Helvetica", "Times New Roman", "Courier New", "Verdana"];

type TextObj = FabricObject & {
  fontFamily?: string;
  fontSize?: number;
  charSpacing?: number;
  lineHeight?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
};

export function PodEditorContextPanel() {
  const { engine, tick, selectedObjectIds } = usePodCore();
  const canvas = engine?.canvas ?? null;
  const obj = getSelectedObjects(canvas)[0] ?? null;

  if (!obj) {
    return (
      <p className="text-xs text-white/40 py-8 text-center leading-relaxed">
        Nesne seçin — görsel veya yazı özellikleri burada görünür.
      </p>
    );
  }

  const kind = kindFromFabricType(obj.type);
  const key = `${tick}-${selectedObjectIds.join(",")}`;

  if (kind === "text") return <TextProperties obj={obj} key={key} />;
  if (kind === "image" || kind === "rect" || kind === "circle" || kind === "path") {
    return <ImageLikeProperties obj={obj} key={key} />;
  }
  return <PodEditorObjectProperties key={key} />;
}

function ImageLikeProperties({ obj }: { obj: FabricObject }) {
  const { engine, refresh } = usePodCore();
  const canvas = engine?.canvas ?? null;
  const opacity = Math.round((obj.opacity ?? 1) * 100);
  const rotation = Math.round(obj.angle ?? 0);
  const locked = obj.selectable === false;
  const blend = (obj.globalCompositeOperation as string) || "source-over";

  const patch = (data: Record<string, unknown>) => {
    if (!canvas) return;
    obj.set(data);
    obj.setCoords();
    canvas.requestRenderAll();
    refresh();
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Görsel / Şekil</p>
      <label className="block space-y-1">
        <span className="text-[10px] text-white/40">Opaklık %</span>
        <input type="range" min={0} max={100} value={opacity} onChange={(e) => patch({ opacity: Number(e.target.value) / 100 })} className="w-full" />
      </label>
      <label className="block space-y-1">
        <span className="text-[10px] text-white/40">Döndürme</span>
        <input type="number" value={rotation} onChange={(e) => patch({ angle: Number(e.target.value) })} className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs" />
      </label>
      <label className="block space-y-1">
        <span className="text-[10px] text-white/40">Gölge</span>
        <select
          value={obj.shadow ? "on" : "off"}
          onChange={(e) =>
            patch({
              shadow: e.target.value === "on" ? new Shadow({ color: "rgba(0,0,0,0.35)", blur: 12, offsetX: 4, offsetY: 4 }) : null,
            })
          }
          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs"
        >
          <option value="off">Kapalı</option>
          <option value="on">Yumuşak gölge</option>
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-[10px] text-white/40">Blend modu</span>
        <select value={blend} onChange={(e) => patch({ globalCompositeOperation: e.target.value })} className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs">
          <option value="source-over">Normal</option>
          <option value="multiply">Multiply</option>
          <option value="screen">Screen</option>
          <option value="overlay">Overlay</option>
        </select>
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={() => patch({ flipX: !obj.flipX })} className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-white/10 py-1.5 text-[10px] hover:bg-white/5">
          <FlipHorizontal className="h-3 w-3" /> Yatay
        </button>
        <button type="button" onClick={() => patch({ flipY: !obj.flipY })} className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-white/10 py-1.5 text-[10px] hover:bg-white/5">
          <FlipVertical className="h-3 w-3" /> Dikey
        </button>
        <button type="button" onClick={() => patch({ selectable: locked, evented: locked })} className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-white/10 py-1.5 text-[10px] hover:bg-white/5">
          {locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {locked ? "Aç" : "Kilitle"}
        </button>
      </div>
      <PodEditorObjectProperties />
    </div>
  );
}

function TextProperties({ obj }: { obj: FabricObject }) {
  const { engine, refresh } = usePodCore();
  const canvas = engine?.canvas ?? null;
  const text = obj as TextObj;

  const patch = (data: Record<string, unknown>) => {
    if (!canvas) return;
    obj.set(data);
    obj.setCoords();
    canvas.requestRenderAll();
    refresh();
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Yazı</p>
      <label className="block space-y-1">
        <span className="text-[10px] text-white/40">Font</span>
        <select value={String(text.fontFamily || "Inter")} onChange={(e) => patch({ fontFamily: e.target.value })} className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs">
          {FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-[10px] text-white/40">Boyut</span>
          <input type="number" min={8} max={200} value={Math.round(text.fontSize ?? 28)} onChange={(e) => patch({ fontSize: Number(e.target.value) })} className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs" />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] text-white/40">Renk</span>
          <input type="color" value={String(text.fill || "#1e293b")} onChange={(e) => patch({ fill: e.target.value })} className="w-full h-8 rounded border border-white/10 bg-transparent" />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-[10px] text-white/40">Harf aralığı</span>
        <input type="range" min={-50} max={200} value={text.charSpacing ?? 0} onChange={(e) => patch({ charSpacing: Number(e.target.value) })} className="w-full" />
      </label>
      <label className="block space-y-1">
        <span className="text-[10px] text-white/40">Satır yüksekliği</span>
        <input type="range" min={0.8} max={2.5} step={0.05} value={text.lineHeight ?? 1.2} onChange={(e) => patch({ lineHeight: Number(e.target.value) })} className="w-full" />
      </label>
      <label className="block space-y-1">
        <span className="text-[10px] text-white/40">Kontur (outline)</span>
        <div className="grid grid-cols-2 gap-2">
          <input type="color" value={String(text.stroke || "#000000")} onChange={(e) => patch({ stroke: e.target.value, strokeWidth: text.strokeWidth || 1 })} className="w-full h-8 rounded border border-white/10" />
          <input type="number" min={0} max={12} value={text.strokeWidth ?? 0} onChange={(e) => patch({ strokeWidth: Number(e.target.value) })} className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs" />
        </div>
      </label>
      <p className="text-[9px] text-white/30 italic">Eğri metin (curve) sonraki fazda.</p>
      <PodEditorObjectProperties />
    </div>
  );
}
