import type { PodOverlayArea, PodPlacement, PodSafeArea } from "./types";
import { DEFAULT_PLACEMENT, parseOverlayArea, parsePlacement } from "./types";

export function normalizePlacement(input: Partial<PodPlacement>): PodPlacement {
  return {
    x: Number(input.x ?? 0),
    y: Number(input.y ?? 0),
    scale: Math.max(0.1, Math.min(3, Number(input.scale ?? 1))),
    rotation: ((Number(input.rotation ?? 0) % 360) + 360) % 360,
  };
}

export function defaultPlacementForOverlay(overlay: PodOverlayArea): PodPlacement {
  return { ...DEFAULT_PLACEMENT, scale: 0.85 };
}

export function parseSafeArea(json: string): PodSafeArea {
  try {
    const s = JSON.parse(json || "{}") as Partial<PodSafeArea>;
    return {
      x: Number(s.x ?? 0),
      y: Number(s.y ?? 0),
      width: Number(s.width ?? 0),
      height: Number(s.height ?? 0),
    };
  } catch {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
}

export function clampPlacementToOverlay(
  placement: PodPlacement,
  designWidth: number,
  designHeight: number,
  overlay: PodOverlayArea
): PodPlacement {
  if (!designWidth || !designHeight) return placement;

  const scaledW = designWidth * placement.scale;
  const scaledH = designHeight * placement.scale;
  const maxX = Math.max(0, overlay.width - scaledW);
  const maxY = Math.max(0, overlay.height - scaledH);

  return {
    ...placement,
    x: Math.max(-overlay.width * 0.25, Math.min(maxX, placement.x)),
    y: Math.max(-overlay.height * 0.25, Math.min(maxY, placement.y)),
  };
}

export function serializePlacement(placement: PodPlacement): string {
  return JSON.stringify(normalizePlacement(placement));
}

export function placementFromJson(json: string): PodPlacement {
  return normalizePlacement(parsePlacement(json));
}

export function overlayFromTemplate(template: {
  overlayAreaJson: string;
  printWidth: number;
  printHeight: number;
}): PodOverlayArea {
  const parsed = parseOverlayArea(template.overlayAreaJson);
  if (parsed.width > 0 && parsed.height > 0) return parsed;
  return {
    x: 50,
    y: 50,
    width: Math.max(200, template.printWidth || 300),
    height: Math.max(200, template.printHeight || 400),
  };
}

export type CanvasDrawState = {
  placement: PodPlacement;
  overlay: PodOverlayArea;
  designImageUrl: string;
  templateImageUrl: string;
};

export function computeDesignDrawRect(
  placement: PodPlacement,
  designWidth: number,
  designHeight: number,
  overlay: PodOverlayArea
) {
  const aspect = designWidth / Math.max(designHeight, 1);
  let drawW = overlay.width * placement.scale;
  let drawH = drawW / aspect;
  if (drawH > overlay.height * placement.scale) {
    drawH = overlay.height * placement.scale;
    drawW = drawH * aspect;
  }
  const left = overlay.x + placement.x + (overlay.width - drawW) / 2;
  const top = overlay.y + placement.y + (overlay.height - drawH) / 2;
  return { left, top, width: drawW, height: drawH };
}
