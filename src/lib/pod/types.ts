export const POD_DESIGNER_VERSION = "POD_DESIGNER_V1" as const;

export const POD_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type PodFileType = "PNG" | "SVG";

export type PodPlacement = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type PodOverlayArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PodSafeArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PodProjectStatus = "DRAFT" | "MOCKUP_READY" | "STORE_READY";

export const DEFAULT_PLACEMENT: PodPlacement = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
};

export function parsePlacement(json: string): PodPlacement {
  try {
    const p = JSON.parse(json || "{}") as Partial<PodPlacement>;
    return {
      x: Number(p.x ?? 0),
      y: Number(p.y ?? 0),
      scale: Math.max(0.1, Math.min(3, Number(p.scale ?? 1))),
      rotation: Number(p.rotation ?? 0),
    };
  } catch {
    return { ...DEFAULT_PLACEMENT };
  }
}

export function parseOverlayArea(json: string): PodOverlayArea {
  try {
    const o = JSON.parse(json || "{}") as Partial<PodOverlayArea>;
    return {
      x: Number(o.x ?? 0),
      y: Number(o.y ?? 0),
      width: Number(o.width ?? 200),
      height: Number(o.height ?? 200),
    };
  } catch {
    return { x: 0, y: 0, width: 200, height: 200 };
  }
}
