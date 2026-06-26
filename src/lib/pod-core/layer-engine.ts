import type { Canvas, FabricObject } from "fabric";
import { kindFromFabricType, type PodCoreLayerItem } from "./pod-types";
import { isSystemObject } from "./print-area-overlay";
import { ensureObjectId, getObjectId } from "./selection-engine";

const LAYER_NAME_KEY = "podLayerName";

export function getLayerDisplayName(obj: FabricObject, fallback: string): string {
  const custom = obj.get(LAYER_NAME_KEY);
  return typeof custom === "string" && custom.trim() ? custom : fallback;
}

export function setLayerDisplayName(obj: FabricObject, name: string): void {
  obj.set(LAYER_NAME_KEY, name.trim());
}

export function buildLayerList(canvas: Canvas | null): PodCoreLayerItem[] {
  if (!canvas) return [];
  const objects = canvas.getObjects().filter((o) => !isSystemObject(o));
  return objects.map((obj, index) => {
    const id = ensureObjectId(obj, `layer-${index}-${obj.type || "obj"}`);
    const kind = kindFromFabricType(obj.type);
    const label =
      kind === "text"
        ? String((obj as FabricObject & { text?: string }).text || "Metin").slice(0, 24)
        : `${kind.charAt(0).toUpperCase()}${kind.slice(1)} ${index + 1}`;
    return {
      id,
      name: getLayerDisplayName(obj, label),
      kind,
      visible: obj.visible !== false,
      locked: !obj.selectable,
      zIndex: index,
    };
  });
}

export function bringForward(canvas: Canvas | null, id?: string): void {
  if (!canvas) return;
  const obj = resolveObject(canvas, id);
  if (!obj) return;
  canvas.bringObjectForward(obj);
  canvas.requestRenderAll();
}

export function sendBackward(canvas: Canvas | null, id?: string): void {
  if (!canvas) return;
  const obj = resolveObject(canvas, id);
  if (!obj) return;
  canvas.sendObjectBackwards(obj);
  canvas.requestRenderAll();
}

export function bringToFront(canvas: Canvas | null, id?: string): void {
  if (!canvas) return;
  const obj = resolveObject(canvas, id);
  if (!obj) return;
  canvas.bringObjectToFront(obj);
  canvas.requestRenderAll();
}

export function sendToBack(canvas: Canvas | null, id?: string): void {
  if (!canvas) return;
  const obj = resolveObject(canvas, id);
  if (!obj) return;
  canvas.sendObjectToBack(obj);
  canvas.requestRenderAll();
}

export function setLayerVisible(canvas: Canvas | null, id: string, visible: boolean): void {
  if (!canvas) return;
  const obj = canvas.getObjects().find((o) => getObjectId(o) === id);
  if (!obj) return;
  obj.set("visible", visible);
  canvas.requestRenderAll();
}

export function setLayerLocked(canvas: Canvas | null, id: string, locked: boolean): void {
  if (!canvas) return;
  const obj = canvas.getObjects().find((o) => getObjectId(o) === id);
  if (!obj) return;
  obj.set({
    selectable: !locked,
    evented: !locked,
  });
  canvas.requestRenderAll();
}

export function renameLayer(canvas: Canvas | null, id: string, name: string): void {
  if (!canvas) return;
  const obj = canvas.getObjects().find((o) => getObjectId(o) === id);
  if (!obj) return;
  setLayerDisplayName(obj, name);
  canvas.requestRenderAll();
}

export function setLayerOpacity(canvas: Canvas | null, id: string, opacity: number): void {
  if (!canvas) return;
  const obj = canvas.getObjects().find((o) => getObjectId(o) === id);
  if (!obj) return;
  obj.set("opacity", Math.max(0, Math.min(1, opacity)));
  canvas.requestRenderAll();
}

export async function duplicateLayer(canvas: Canvas | null, id: string): Promise<void> {
  if (!canvas) return;
  const obj = canvas.getObjects().find((o) => getObjectId(o) === id);
  if (!obj) return;
  const cloned = await obj.clone();
  cloned.set({ left: (obj.left ?? 0) + 16, top: (obj.top ?? 0) + 16 });
  canvas.add(cloned);
  canvas.setActiveObject(cloned);
  canvas.requestRenderAll();
}

export function deleteLayer(canvas: Canvas | null, id: string): void {
  if (!canvas) return;
  const obj = canvas.getObjects().find((o) => getObjectId(o) === id);
  if (!obj) return;
  canvas.remove(obj);
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

export function reorderLayer(canvas: Canvas | null, id: string, targetIndex: number): void {
  if (!canvas) return;
  const objects = canvas.getObjects().filter((o) => !isSystemObject(o));
  const obj = objects.find((o) => getObjectId(o) === id);
  if (!obj) return;
  const currentIndex = objects.indexOf(obj);
  if (currentIndex < 0 || currentIndex === targetIndex) return;
  canvas.moveObjectTo(obj, targetIndex);
  canvas.requestRenderAll();
}

function resolveObject(canvas: Canvas, id?: string): FabricObject | undefined {
  if (id) {
    return canvas.getObjects().find((o) => getObjectId(o) === id);
  }
  return canvas.getActiveObject() ?? undefined;
}
