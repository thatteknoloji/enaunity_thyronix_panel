export const POD_CORE_VERSION = "ENA_POD_CORE_V1" as const;

/** Dev-only flag — mevcut POD V1 ile yan yana çalışır */
export const POD_CORE_DEV_ENABLED = true;

export type PodCoreObjectKind = "rect" | "circle" | "text" | "image" | "path" | "group" | "unknown";

export type PodCoreLayerItem = {
  id: string;
  name: string;
  kind: PodCoreObjectKind;
  visible: boolean;
  locked: boolean;
  zIndex: number;
};

export type PodCoreViewport = {
  zoom: number;
  panX: number;
  panY: number;
};

export type PodCoreCanvasMeta = {
  version: typeof POD_CORE_VERSION;
  width: number;
  height: number;
  backgroundColor: string;
  viewport: PodCoreViewport;
};

/** Fabric canvas JSON + ENA meta */
export type PodCoreDocument = PodCoreCanvasMeta & {
  fabricJson: Record<string, unknown>;
};

export type PodCoreHistoryEntry = {
  id: string;
  label: string;
  timestamp: number;
};

export type PodCoreTool = "select" | "pan" | "rect" | "circle" | "text";

export type PodCoreExportFormat = "json";

export const POD_CORE_DEFAULTS = {
  width: 800,
  height: 600,
  backgroundColor: "#ffffff",
  zoom: 1,
  minZoom: 0.25,
  maxZoom: 4,
  historyLimit: 50,
} as const;

export function createEmptyDocument(
  width = POD_CORE_DEFAULTS.width,
  height = POD_CORE_DEFAULTS.height
): PodCoreDocument {
  return {
    version: POD_CORE_VERSION,
    width,
    height,
    backgroundColor: POD_CORE_DEFAULTS.backgroundColor,
    viewport: { zoom: 1, panX: 0, panY: 0 },
    fabricJson: { version: "6.6.0", objects: [] },
  };
}

export function kindFromFabricType(type: string | undefined): PodCoreObjectKind {
  switch (type) {
    case "rect":
      return "rect";
    case "circle":
      return "circle";
    case "textbox":
    case "text":
    case "i-text":
      return "text";
    case "image":
      return "image";
    case "path":
      return "path";
    case "group":
      return "group";
    default:
      return "unknown";
  }
}
