import type { PodCoreDocument } from "./pod-types";

/** Faz 2 — print area bounds, clip, DPI dönüşümü */
export type PodPrintAreaRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: "px" | "cm";
  dpi: number;
};

export function createDefaultPrintArea(
  canvasWidth: number,
  canvasHeight: number
): PodPrintAreaRect {
  const margin = Math.min(canvasWidth, canvasHeight) * 0.1;
  return {
    x: margin,
    y: margin,
    width: canvasWidth - margin * 2,
    height: canvasHeight - margin * 2,
    unit: "px",
    dpi: 300,
  };
}

/** V1 stub — sonraki fazda fabric clipPath ile bağlanacak */
export function printAreaFromDocument(_doc: PodCoreDocument): PodPrintAreaRect | null {
  return null;
}
