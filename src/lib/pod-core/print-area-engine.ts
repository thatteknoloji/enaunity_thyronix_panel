import type { MockupTemplate, PodAreaRect, PodPrintAreaBundle } from "./pod-types";
import { POD_CORE_DEFAULTS } from "./pod-types";

export type PrintAreaAlignMode = "contain" | "cover" | "center";

export type PrintAreaInput = {
  canvasWidth: number;
  canvasHeight: number;
  printable?: PodAreaRect;
  safeMargin?: number;
  bleedMargin?: number;
  dpi?: number;
  rotation?: number;
  scale?: number;
};

export function calculatePrintArea(input: PrintAreaInput): PodAreaRect {
  const { canvasWidth, canvasHeight } = input;
  if (input.printable) {
    return normalizeRect(input.printable, input.rotation, input.scale);
  }
  const margin = Math.min(canvasWidth, canvasHeight) * 0.1;
  return {
    x: margin,
    y: margin,
    width: canvasWidth - margin * 2,
    height: canvasHeight - margin * 2,
    rotation: input.rotation ?? 0,
    scale: input.scale ?? 1,
  };
}

export function calculateSafeArea(printable: PodAreaRect, safeMargin: number = POD_CORE_DEFAULTS.defaultSafeMarginPx): PodAreaRect {
  const m = Math.max(0, safeMargin);
  return {
    x: printable.x + m,
    y: printable.y + m,
    width: Math.max(1, printable.width - m * 2),
    height: Math.max(1, printable.height - m * 2),
    rotation: printable.rotation,
    scale: printable.scale,
  };
}

export function calculateBleed(printable: PodAreaRect, bleedMargin: number = POD_CORE_DEFAULTS.defaultBleedPx): PodAreaRect {
  const b = Math.max(0, bleedMargin);
  return {
    x: printable.x - b,
    y: printable.y - b,
    width: printable.width + b * 2,
    height: printable.height + b * 2,
    rotation: printable.rotation,
    scale: printable.scale,
  };
}

export function buildPrintAreaBundle(input: PrintAreaInput): PodPrintAreaBundle {
  const printable = calculatePrintArea(input);
  const margin = input.safeMargin ?? POD_CORE_DEFAULTS.defaultSafeMarginPx;
  const bleedMargin = input.bleedMargin ?? POD_CORE_DEFAULTS.defaultBleedPx;
  const safe = calculateSafeArea(printable, margin);
  const bleed = calculateBleed(printable, bleedMargin);
  return {
    printable,
    safe,
    bleed,
    clip: { ...printable },
    margin,
    dpi: input.dpi ?? POD_CORE_DEFAULTS.defaultDpi,
  };
}

export function printAreaBundleFromTemplate(
  template: MockupTemplate,
  canvasWidth: number,
  canvasHeight: number
): PodPrintAreaBundle {
  const scaleX = canvasWidth / template.width;
  const scaleY = canvasHeight / template.height;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (canvasWidth - template.width * scale) / 2;
  const offsetY = (canvasHeight - template.height * scale) / 2;
  const pa = template.printArea;
  const printable: PodAreaRect = {
    x: offsetX + pa.x * scale,
    y: offsetY + pa.y * scale,
    width: pa.width * scale,
    height: pa.height * scale,
    rotation: pa.rotation ?? 0,
    scale: pa.scale ?? 1,
  };
  return buildPrintAreaBundle({
    canvasWidth,
    canvasHeight,
    printable,
    safeMargin: template.safeArea * scale,
    bleedMargin: template.bleed * scale,
  });
}

export type BoundsRect = { left: number; top: number; width: number; height: number };

export function isOutsidePrintableArea(bounds: BoundsRect, printable: PodAreaRect): boolean {
  const right = bounds.left + bounds.width;
  const bottom = bounds.top + bounds.height;
  const pRight = printable.x + printable.width;
  const pBottom = printable.y + printable.height;
  return (
    bounds.left < printable.x ||
    bounds.top < printable.y ||
    right > pRight ||
    bottom > pBottom
  );
}

export function alignRectInArea(
  source: { width: number; height: number },
  area: PodAreaRect,
  mode: PrintAreaAlignMode
): PodAreaRect {
  const sw = source.width;
  const sh = source.height;
  if (!sw || !sh) {
    return { x: area.x, y: area.y, width: area.width, height: area.height };
  }
  let w = area.width;
  let h = area.height;
  let x = area.x;
  let y = area.y;
  const ratio = sw / sh;
  const areaRatio = area.width / area.height;

  if (mode === "contain") {
    if (ratio > areaRatio) {
      w = area.width;
      h = area.width / ratio;
    } else {
      h = area.height;
      w = area.height * ratio;
    }
    x = area.x + (area.width - w) / 2;
    y = area.y + (area.height - h) / 2;
  } else if (mode === "cover") {
    if (ratio > areaRatio) {
      h = area.height;
      w = area.height * ratio;
    } else {
      w = area.width;
      h = area.width / ratio;
    }
    x = area.x + (area.width - w) / 2;
    y = area.y + (area.height - h) / 2;
  } else {
    x = area.x + (area.width - sw) / 2;
    y = area.y + (area.height - sh) / 2;
    w = sw;
    h = sh;
  }

  return { x, y, width: w, height: h, rotation: area.rotation, scale: area.scale };
}

export function cropRectForMode(
  bundle: PodPrintAreaBundle,
  mode: "print" | "safe" | "bleed" | "full"
): PodAreaRect {
  switch (mode) {
    case "safe":
      return bundle.safe;
    case "bleed":
      return bundle.bleed;
    case "print":
      return bundle.printable;
    default:
      return bundle.clip;
  }
}

function normalizeRect(rect: PodAreaRect, rotation?: number, scale?: number): PodAreaRect {
  return {
    ...rect,
    rotation: rotation ?? rect.rotation ?? 0,
    scale: scale ?? rect.scale ?? 1,
  };
}
