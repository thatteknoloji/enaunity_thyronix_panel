"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Lock,
  Trash2,
  Unlock,
} from "lucide-react";
import {
  buildLayerList,
  bringForward,
  bringToFront,
  deleteLayer,
  duplicateLayer,
  renameLayer,
  sendBackward,
  sendToBack,
  setLayerLocked,
  setLayerOpacity,
  setLayerVisible,
  reorderLayer,
} from "@/lib/pod-core/layer-engine";
import { selectObjectById } from "@/lib/pod-core/selection-engine";
import { usePodCore } from "./pod-core-context";

export function PodLayerPanel() {
  const { engine, tick, refresh } = usePodCore();
  const layers = buildLayerList(engine?.canvas ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  const selectLayer = (id: string) => {
    selectObjectById(engine?.canvas ?? null, id);
    refresh();
  };

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const commitRename = (id: string) => {
    if (editName.trim()) renameLayer(engine?.canvas ?? null, id, editName.trim());
    setEditingId(null);
    refresh();
  };

  const displayLayers = [...layers].reverse();

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
        <Layers className="h-3.5 w-3.5" /> Katmanlar ({layers.length})
      </p>
      <ul className="max-h-72 overflow-y-auto space-y-1" key={tick}>
        {displayLayers.map((layer, visualIndex) => (
          <li
            key={layer.id}
            draggable
            onDragStart={() => setDragId(layer.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (!dragId || dragId === layer.id) return;
              const targetIndex = layers.length - 1 - visualIndex;
              reorderLayer(engine?.canvas ?? null, dragId, targetIndex);
              setDragId(null);
              refresh();
            }}
            className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 text-xs ${
              dragId === layer.id ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-white/5"
            }`}
          >
            <GripVertical className="h-3 w-3 text-white/25 shrink-0 cursor-grab" />
            <button
              type="button"
              title={layer.visible ? "Gizle" : "Göster"}
              onClick={() => {
                setLayerVisible(engine?.canvas ?? null, layer.id, !layer.visible);
                refresh();
              }}
              className="text-white/50 hover:text-white shrink-0"
            >
              {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            {editingId === layer.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => commitRename(layer.id)}
                onKeyDown={(e) => e.key === "Enter" && commitRename(layer.id)}
                className="flex-1 min-w-0 bg-transparent border-b border-emerald-500/50 text-[11px] outline-none"
              />
            ) : (
              <button
                type="button"
                className="flex-1 truncate text-left hover:text-emerald-400 text-[11px]"
                onClick={() => selectLayer(layer.id)}
                onDoubleClick={() => startRename(layer.id, layer.name)}
              >
                {layer.name}
              </button>
            )}
            <input
              type="range"
              min={0}
              max={100}
              title="Opaklık"
              className="w-10 shrink-0"
              defaultValue={100}
              onChange={(e) => {
                setLayerOpacity(engine?.canvas ?? null, layer.id, Number(e.target.value) / 100);
                refresh();
              }}
            />
            <button
              type="button"
              title={layer.locked ? "Kilidi aç" : "Kilitle"}
              onClick={() => {
                setLayerLocked(engine?.canvas ?? null, layer.id, !layer.locked);
                refresh();
              }}
              className="shrink-0 text-white/40 hover:text-white"
            >
              {layer.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            </button>
            <button
              type="button"
              title="Kopyala"
              onClick={() => void duplicateLayer(engine?.canvas ?? null, layer.id).then(refresh)}
              className="shrink-0 text-white/40 hover:text-emerald-400"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              type="button"
              title="Sil"
              onClick={() => {
                deleteLayer(engine?.canvas ?? null, layer.id);
                refresh();
              }}
              className="shrink-0 text-white/40 hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
        {!layers.length && <li className="text-xs text-white/40 py-4 text-center">Henüz katman yok</li>}
      </ul>
      <div className="flex gap-1 text-[10px]">
        <button type="button" className="flex-1 rounded border border-white/10 py-1 hover:bg-white/5" onClick={() => { bringForward(engine?.canvas ?? null); refresh(); }}>
          <ChevronUp className="h-3 w-3 inline" /> Öne
        </button>
        <button type="button" className="flex-1 rounded border border-white/10 py-1 hover:bg-white/5" onClick={() => { sendBackward(engine?.canvas ?? null); refresh(); }}>
          <ChevronDown className="h-3 w-3 inline" /> Arkaya
        </button>
        <button type="button" className="flex-1 rounded border border-white/10 py-1 hover:bg-white/5" onClick={() => { bringToFront(engine?.canvas ?? null, displayLayers[0]?.id); refresh(); }}>
          En öne
        </button>
        <button type="button" className="flex-1 rounded border border-white/10 py-1 hover:bg-white/5" onClick={() => { sendToBack(engine?.canvas ?? null, displayLayers[displayLayers.length - 1]?.id); refresh(); }}>
          En arkaya
        </button>
      </div>
    </div>
  );
}
