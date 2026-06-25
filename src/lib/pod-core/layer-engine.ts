import type { Canvas, FabricObject } from "fabric";
import { kindFromFabricType, type PodCoreLayerItem } from "./pod-types";
import { ensureObjectId, getObjectId } from "./selection-engine";

export function buildLayerList(canvas: Canvas | null): PodCoreLayerItem[] {
  if (!canvas) return [];
  const objects = canvas.getObjects();
  return objects.map((obj, index) => {
    const id = ensureObjectId(obj, `layer-${index}-${obj.type || "obj"}`);
    const kind = kindFromFabricType(obj.type);
    const label =
      kind === "text"
        ? String((obj as FabricObject & { text?: string }).text || "Metin").slice(0, 24)
        : `${kind.charAt(0).toUpperCase()}${kind.slice(1)} ${index + 1}`;
    return {
      id,
      name: label,
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

function resolveObject(canvas: Canvas, id?: string): FabricObject | undefined {
  if (id) {
    return canvas.getObjects().find((o) => getObjectId(o) === id);
  }
  return canvas.getActiveObject() ?? undefined;
}
