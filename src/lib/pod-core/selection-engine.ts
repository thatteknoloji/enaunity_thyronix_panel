import type { Canvas, FabricObject } from "fabric";

export const POD_OBJECT_ID_KEY = "podCoreId";

export function ensureObjectId(obj: FabricObject, fallback: string): string {
  const existing = obj.get(POD_OBJECT_ID_KEY) as string | undefined;
  if (existing) return existing;
  obj.set(POD_OBJECT_ID_KEY, fallback);
  return fallback;
}

export function getObjectId(obj: FabricObject): string {
  return (obj.get(POD_OBJECT_ID_KEY) as string) || obj.type || "object";
}

export function getSelectedObjects(canvas: Canvas | null): FabricObject[] {
  if (!canvas) return [];
  const active = canvas.getActiveObject();
  if (!active) return [];
  if (active.type === "activeSelection" && "getObjects" in active) {
    return (active as FabricObject & { getObjects(): FabricObject[] }).getObjects();
  }
  return [active];
}

export function getSelectedIds(canvas: Canvas | null): string[] {
  return getSelectedObjects(canvas).map((o, i) => getObjectId(o) || `sel-${i}`);
}

export function selectObjectById(canvas: Canvas | null, id: string): boolean {
  if (!canvas) return false;
  const target = canvas.getObjects().find((o) => getObjectId(o) === id);
  if (!target) return false;
  canvas.setActiveObject(target);
  canvas.requestRenderAll();
  return true;
}

export function clearSelection(canvas: Canvas | null): void {
  if (!canvas) return;
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

export function deleteSelected(canvas: Canvas | null): number {
  if (!canvas) return 0;
  const targets = getSelectedObjects(canvas);
  if (!targets.length) return 0;
  targets.forEach((obj) => canvas.remove(obj));
  canvas.discardActiveObject();
  canvas.requestRenderAll();
  return targets.length;
}
