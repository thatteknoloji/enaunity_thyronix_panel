"use client";

import { ChevronDown, ChevronUp, Eye, EyeOff, Layers } from "lucide-react";
import { buildLayerList, bringForward, bringToFront, sendBackward, sendToBack, setLayerVisible } from "@/lib/pod-core/layer-engine";
import { selectObjectById } from "@/lib/pod-core/selection-engine";
import { usePodCore } from "./pod-core-context";

export function PodLayerPanel() {
  const { engine, tick, refresh } = usePodCore();
  const layers = buildLayerList(engine?.canvas ?? null);

  const selectLayer = (id: string) => {
    selectObjectById(engine?.canvas ?? null, id);
    refresh();
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
        <Layers className="h-3.5 w-3.5" /> Katmanlar ({layers.length})
      </p>
      <ul className="max-h-64 overflow-y-auto space-y-1" key={tick}>
        {[...layers].reverse().map((layer) => (
          <li
            key={layer.id}
            className="flex items-center gap-1 rounded-lg border border-ena-border bg-white/5 px-2 py-1.5 text-xs"
          >
            <button
              type="button"
              title={layer.visible ? "Gizle" : "Göster"}
              onClick={() => {
                setLayerVisible(engine?.canvas ?? null, layer.id, !layer.visible);
                refresh();
              }}
              className="text-ena-light/70 hover:text-ena-text"
            >
              {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              className="flex-1 truncate text-left hover:text-emerald-600"
              onClick={() => selectLayer(layer.id)}
            >
              {layer.name}
            </button>
            <div className="flex gap-0.5">
              <button type="button" title="Öne" onClick={() => { bringToFront(engine?.canvas ?? null, layer.id); refresh(); }} className="p-0.5 hover:text-emerald-600"><ChevronUp className="h-3 w-3" /></button>
              <button type="button" title="Arkaya" onClick={() => { sendToBack(engine?.canvas ?? null, layer.id); refresh(); }} className="p-0.5 hover:text-emerald-600"><ChevronDown className="h-3 w-3" /></button>
            </div>
          </li>
        ))}
        {!layers.length && (
          <li className="text-xs text-ena-light/50 py-4 text-center">Henüz katman yok</li>
        )}
      </ul>
      <div className="flex gap-1 text-[10px]">
        <button type="button" className="rounded border border-ena-border px-2 py-1" onClick={() => { bringForward(engine?.canvas ?? null); refresh(); }}>Bir öne</button>
        <button type="button" className="rounded border border-ena-border px-2 py-1" onClick={() => { sendBackward(engine?.canvas ?? null); refresh(); }}>Bir arkaya</button>
      </div>
    </div>
  );
}
