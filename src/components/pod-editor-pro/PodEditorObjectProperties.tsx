"use client";

import type { FabricObject } from "fabric";
import {
  bringForward,
  bringToFront,
  sendBackward,
  sendToBack,
} from "@/lib/pod-core/layer-engine";
import { getSelectedObjects } from "@/lib/pod-core/selection-engine";
import { usePodCore } from "@/components/pod-core/pod-core-context";
import { Copy, Lock, Trash2, Unlock } from "lucide-react";

function readDim(obj: FabricObject) {
  return {
    x: Math.round(obj.left ?? 0),
    y: Math.round(obj.top ?? 0),
    w: Math.round((obj.width ?? 0) * (obj.scaleX ?? 1)),
    h: Math.round((obj.height ?? 0) * (obj.scaleY ?? 1)),
    rotation: Math.round(obj.angle ?? 0),
    opacity: Math.round((obj.opacity ?? 1) * 100),
    locked: obj.selectable === false,
  };
}

export function PodEditorObjectProperties() {
  const { engine, tick, refresh, selectedObjectIds } = usePodCore();
  const canvas = engine?.canvas ?? null;
  const obj = getSelectedObjects(canvas)[0] ?? null;

  if (!obj) {
    return (
      <p className="text-xs text-white/40 py-6 text-center">
        Nesne seçin — özellikler burada görünür
      </p>
    );
  }

  const dims = readDim(obj);

  const patch = (patch: Record<string, number | boolean>) => {
    if (!canvas || !obj) return;
    if ("x" in patch) obj.set("left", patch.x as number);
    if ("y" in patch) obj.set("top", patch.y as number);
    if ("w" in patch && obj.width) {
      obj.set("scaleX", (patch.w as number) / obj.width);
    }
    if ("h" in patch && obj.height) {
      obj.set("scaleY", (patch.h as number) / obj.height);
    }
    if ("rotation" in patch) obj.set("angle", patch.rotation as number);
    if ("opacity" in patch) obj.set("opacity", (patch.opacity as number) / 100);
    if ("locked" in patch) {
      const locked = patch.locked as boolean;
      obj.set({ selectable: !locked, evented: !locked });
    }
    obj.setCoords();
    canvas.requestRenderAll();
    refresh();
  };

  const duplicate = async () => {
    if (!canvas || !obj) return;
    const cloned = await obj.clone();
    cloned.set({ left: (obj.left ?? 0) + 16, top: (obj.top ?? 0) + 16 });
    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    canvas.requestRenderAll();
    refresh();
  };

  return (
    <div className="space-y-3" key={`${tick}-${selectedObjectIds.join(",")}`}>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="X" value={dims.x} onChange={(v) => patch({ x: v })} />
        <NumField label="Y" value={dims.y} onChange={(v) => patch({ y: v })} />
        <NumField label="Genişlik" value={dims.w} onChange={(v) => patch({ w: v })} />
        <NumField label="Yükseklik" value={dims.h} onChange={(v) => patch({ h: v })} />
        <NumField label="Döndür" value={dims.rotation} onChange={(v) => patch({ rotation: v })} />
        <NumField label="Opaklık %" value={dims.opacity} min={0} max={100} onChange={(v) => patch({ opacity: v })} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <ActionBtn
          icon={dims.locked ? Unlock : Lock}
          label={dims.locked ? "Kilidi Aç" : "Kilitle"}
          onClick={() => patch({ locked: !dims.locked })}
        />
        <ActionBtn icon={Copy} label="Kopyala" onClick={() => void duplicate()} />
        <ActionBtn
          icon={Trash2}
          label="Sil"
          danger
          onClick={() => {
            engine?.deleteSelection();
            refresh();
          }}
        />
      </div>

      <div className="flex gap-1 text-[10px]">
        <button type="button" className="flex-1 rounded border border-white/10 py-1.5 hover:bg-white/5" onClick={() => { bringToFront(canvas, String(obj.get("podCoreId"))); refresh(); }}>Öne</button>
        <button type="button" className="flex-1 rounded border border-white/10 py-1.5 hover:bg-white/5" onClick={() => { bringForward(canvas); refresh(); }}>+1</button>
        <button type="button" className="flex-1 rounded border border-white/10 py-1.5 hover:bg-white/5" onClick={() => { sendBackward(canvas); refresh(); }}>-1</button>
        <button type="button" className="flex-1 rounded border border-white/10 py-1.5 hover:bg-white/5" onClick={() => { sendToBack(canvas, String(obj.get("podCoreId"))); refresh(); }}>Arkaya</button>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] text-white/40 uppercase tracking-wide">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white font-mono"
      />
    </label>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] ${
        danger
          ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
          : "border-white/10 text-white/70 hover:bg-white/5"
      }`}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}
