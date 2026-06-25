import type { Canvas, FabricObject, Rect as FabricRect } from "fabric";
import { Line, Rect } from "fabric";
import type { PodOverlayVisibility, PodPrintAreaBundle } from "./pod-types";
import { POD_OVERLAY_COLORS, POD_OVERLAY_KEY, POD_SYSTEM_KEY } from "./pod-types";

export type OverlayKind = "printable" | "safe" | "bleed" | "grid";

const OVERLAY_STROKE: Record<Exclude<OverlayKind, "grid">, string> = {
  printable: POD_OVERLAY_COLORS.printable,
  safe: POD_OVERLAY_COLORS.safe,
  bleed: POD_OVERLAY_COLORS.bleed,
};

export function isSystemObject(obj: FabricObject): boolean {
  return Boolean(obj.get(POD_SYSTEM_KEY));
}

export function removePrintOverlays(canvas: Canvas | null): void {
  if (!canvas) return;
  const toRemove = canvas.getObjects().filter((o) => isSystemObject(o));
  toRemove.forEach((o) => canvas.remove(o));
}

export function syncPrintOverlays(
  canvas: Canvas | null,
  bundle: PodPrintAreaBundle | null,
  visibility: PodOverlayVisibility
): void {
  if (!canvas) return;
  removePrintOverlays(canvas);

  if (!bundle) {
    canvas.requestRenderAll();
    return;
  }

  const layers: { kind: "printable" | "safe" | "bleed"; rect: typeof bundle.printable; visible: boolean }[] = [
    { kind: "bleed", rect: bundle.bleed, visible: visibility.bleed },
    { kind: "safe", rect: bundle.safe, visible: visibility.safe },
    { kind: "printable", rect: bundle.printable, visible: visibility.printable },
  ];

  for (const layer of layers) {
    if (!layer.visible) continue;
    canvas.add(createAreaRect(layer.kind, layer.rect));
  }

  if (visibility.grid) {
    addGridLines(canvas, bundle.printable);
  }

  canvas.getObjects().forEach((o) => {
    if (isSystemObject(o)) {
      canvas.sendObjectToBack(o);
    }
  });
  canvas.requestRenderAll();
}

function createAreaRect(kind: Exclude<OverlayKind, "grid">, area: PodPrintAreaBundle["printable"]): FabricRect {
  const rect = new Rect({
    left: area.x,
    top: area.y,
    width: area.width,
    height: area.height,
    fill: "transparent",
    stroke: OVERLAY_STROKE[kind],
    strokeWidth: 1.5,
    strokeDashArray: kind === "printable" ? [8, 4] : kind === "safe" ? [4, 4] : [2, 6],
    angle: area.rotation ?? 0,
    selectable: false,
    evented: false,
    excludeFromExport: true,
  });
  rect.set(POD_OVERLAY_KEY, kind);
  rect.set(POD_SYSTEM_KEY, true);
  return rect;
}

function addGridLines(canvas: Canvas, area: PodPrintAreaBundle["printable"]): void {
  const step = Math.max(20, Math.round(Math.min(area.width, area.height) / 10));
  for (let x = area.x; x <= area.x + area.width; x += step) {
    const line = new Line([x, area.y, x, area.y + area.height], {
      stroke: POD_OVERLAY_COLORS.grid,
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    line.set(POD_SYSTEM_KEY, true);
    line.set(POD_OVERLAY_KEY, "grid");
    canvas.add(line);
  }
  for (let y = area.y; y <= area.y + area.height; y += step) {
    const line = new Line([area.x, y, area.x + area.width, y], {
      stroke: POD_OVERLAY_COLORS.grid,
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    line.set(POD_SYSTEM_KEY, true);
    line.set(POD_OVERLAY_KEY, "grid");
    canvas.add(line);
  }
}

export function clipToPrintableArea(canvas: Canvas | null, bundle: PodPrintAreaBundle | null): void {
  if (!canvas || !bundle) {
    if (canvas) {
      canvas.clipPath = undefined;
      canvas.requestRenderAll();
    }
    return;
  }
  const clip = new Rect({
    left: bundle.printable.x,
    top: bundle.printable.y,
    width: bundle.printable.width,
    height: bundle.printable.height,
    absolutePositioned: true,
  });
  canvas.clipPath = clip;
  canvas.requestRenderAll();
}

export function clearCanvasClip(canvas: Canvas | null): void {
  if (!canvas) return;
  canvas.clipPath = undefined;
  canvas.requestRenderAll();
}
