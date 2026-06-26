import type { Canvas, FabricObject, Rect as FabricRect, Circle as FabricCircle } from "fabric";
import { Line, Rect, Circle } from "fabric";
import type { PodOverlayVisibility, PodPrintAreaBundle, PodPrintAreaMode } from "./pod-types";
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
  visibility: PodOverlayVisibility,
  printAreaMode: PodPrintAreaMode = "RECTANGLE"
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
    canvas.add(
      printAreaMode === "CIRCLE" && layer.kind === "printable"
        ? createAreaCircle(layer.kind, layer.rect)
        : createAreaRect(layer.kind, layer.rect)
    );
  }

  if (visibility.grid) {
    addGridLines(canvas, bundle.printable);
  }

  if (visibility.centerGuide) {
    addCenterGuides(canvas, bundle.printable);
  }

  canvas.getObjects().forEach((o) => {
    if (isSystemObject(o)) {
      canvas.sendObjectToBack(o);
    }
  });
  canvas.requestRenderAll();
}

function createAreaCircle(kind: Exclude<OverlayKind, "grid">, area: PodPrintAreaBundle["printable"]): FabricCircle {
  const radius = Math.min(area.width, area.height) / 2;
  const circle = new Circle({
    left: area.x + area.width / 2,
    top: area.y + area.height / 2,
    radius,
    originX: "center",
    originY: "center",
    fill: "transparent",
    stroke: OVERLAY_STROKE[kind],
    strokeWidth: 2,
    strokeDashArray: [8, 4],
    angle: area.rotation ?? 0,
    selectable: false,
    evented: false,
    excludeFromExport: true,
  });
  circle.set(POD_OVERLAY_KEY, kind);
  circle.set(POD_SYSTEM_KEY, true);
  return circle;
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

function addCenterGuides(canvas: Canvas, area: PodPrintAreaBundle["printable"]): void {
  const cx = area.x + area.width / 2;
  const cy = area.y + area.height / 2;
  const vLine = new Line([cx, area.y, cx, area.y + area.height], {
    stroke: "rgba(52, 211, 153, 0.35)",
    strokeWidth: 1,
    strokeDashArray: [6, 6],
    selectable: false,
    evented: false,
    excludeFromExport: true,
  });
  vLine.set(POD_SYSTEM_KEY, true);
  vLine.set(POD_OVERLAY_KEY, "center");
  const hLine = new Line([area.x, cy, area.x + area.width, cy], {
    stroke: "rgba(52, 211, 153, 0.35)",
    strokeWidth: 1,
    strokeDashArray: [6, 6],
    selectable: false,
    evented: false,
    excludeFromExport: true,
  });
  hLine.set(POD_SYSTEM_KEY, true);
  hLine.set(POD_OVERLAY_KEY, "center");
  canvas.add(vLine, hLine);
}

export function clipToPrintableArea(
  canvas: Canvas | null,
  bundle: PodPrintAreaBundle | null,
  printAreaMode: PodPrintAreaMode = "RECTANGLE"
): void {
  if (!canvas || !bundle) {
    if (canvas) {
      canvas.clipPath = undefined;
      canvas.requestRenderAll();
    }
    return;
  }
  const area = bundle.printable;
  if (printAreaMode === "CIRCLE") {
    const radius = Math.min(area.width, area.height) / 2;
    const clip = new Circle({
      left: area.x + area.width / 2,
      top: area.y + area.height / 2,
      radius,
      originX: "center",
      originY: "center",
      absolutePositioned: true,
    });
    canvas.clipPath = clip;
  } else {
    const clip = new Rect({
      left: area.x,
      top: area.y,
      width: area.width,
      height: area.height,
      absolutePositioned: true,
    });
    canvas.clipPath = clip;
  }
  canvas.requestRenderAll();
}

export function clearCanvasClip(canvas: Canvas | null): void {
  if (!canvas) return;
  canvas.clipPath = undefined;
  canvas.requestRenderAll();
}
