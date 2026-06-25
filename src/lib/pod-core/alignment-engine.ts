import type { Canvas, FabricObject } from "fabric";

const GUIDE_MARGIN = 6;

/** Basit hizalama kılavuzları — V1: canvas merkez snap */
export function snapObjectToCanvasCenter(canvas: Canvas | null, obj: FabricObject): void {
  if (!canvas || !obj) return;
  const center = canvas.getCenterPoint();
  obj.set({
    left: center.x - ((obj.width || 0) * (obj.scaleX || 1)) / 2,
    top: center.y - ((obj.height || 0) * (obj.scaleY || 1)) / 2,
  });
  obj.setCoords();
}

export function applyCenterGuides(canvas: Canvas | null, obj: FabricObject): boolean {
  if (!canvas) return false;
  const center = canvas.getCenterPoint();
  const objCenter = obj.getCenterPoint();
  let snapped = false;

  if (Math.abs(objCenter.x - center.x) <= GUIDE_MARGIN) {
    snapObjectToCanvasCenter(canvas, obj);
    snapped = true;
  }
  if (Math.abs(objCenter.y - center.y) <= GUIDE_MARGIN) {
    snapObjectToCanvasCenter(canvas, obj);
    snapped = true;
  }

  if (snapped) canvas.requestRenderAll();
  return snapped;
}

export function alignSelectedHorizontally(canvas: Canvas | null, mode: "left" | "center" | "right"): void {
  if (!canvas) return;
  const active = canvas.getActiveObject();
  if (!active || active.type !== "activeSelection") return;
  const group = active as FabricObject & { getObjects(): FabricObject[] };
  const objects = group.getObjects();
  if (objects.length < 2) return;

  const bounds = objects.map((o) => o.getBoundingRect());
  const minLeft = Math.min(...bounds.map((b) => b.left));
  const maxRight = Math.max(...bounds.map((b) => b.left + b.width));
  const centerX = (minLeft + maxRight) / 2;

  objects.forEach((obj, i) => {
    const b = bounds[i];
    if (mode === "left") obj.set("left", obj.left! - (b.left - minLeft));
    if (mode === "right") obj.set("left", obj.left! + (maxRight - (b.left + b.width)));
    if (mode === "center") obj.set("left", obj.left! + (centerX - (b.left + b.width / 2)));
    obj.setCoords();
  });

  canvas.requestRenderAll();
}
