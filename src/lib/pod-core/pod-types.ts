export const POD_CORE_VERSION = "ENA_POD_CORE_V4" as const;
export const PROJECT_SERIALIZER_VERSION = "ENA_POD_CORE_PROJECT_V1" as const;
export const POD_CORE_SOURCE = "pod_core" as const;

/** Dev-only flag — mevcut POD V1 ile yan yana çalışır */
export const POD_CORE_DEV_ENABLED = true;

export const POD_OVERLAY_KEY = "podCoreOverlay" as const;
export const POD_SYSTEM_KEY = "podCoreSystem" as const;

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
  templateId?: string;
};

export type PodCoreHistoryEntry = {
  id: string;
  label: string;
  timestamp: number;
};

export type PodCoreTool = "select" | "pan" | "rect" | "circle" | "text";

export type PodCoreExportFormat = "json" | "png" | "svg" | "pdf";

export type PodAreaRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scale?: number;
};

export type PodPrintAreaBundle = {
  printable: PodAreaRect;
  safe: PodAreaRect;
  bleed: PodAreaRect;
  clip: PodAreaRect;
  margin: number;
  dpi: number;
};

export type PodOverlayVisibility = {
  printable: boolean;
  safe: boolean;
  bleed: boolean;
  grid: boolean;
};

export type MockupOrientation = "landscape" | "portrait";
export type MockupView = "front" | "back" | "left" | "right";
export type MockupFormulaHint = "AREA" | "PIECE";

export type MockupDefaultSize = {
  widthCm: number;
  heightCm: number;
};

export type MockupTemplate = {
  id: string;
  name: string;
  image: string;
  printArea: PodAreaRect;
  bleed: number;
  safeArea: number;
  orientation: MockupOrientation;
  variant: MockupView;
  width: number;
  height: number;
  category: string;
  /** Pricing Engine rule code */
  pricingRuleCode: string;
  /** Material code (PricingMaterial) */
  materialCode: string;
  /** Variant metadata id for API / order bridge */
  variantId: string;
  defaultSize: MockupDefaultSize;
  defaultQuantity: number;
  formulaHint: MockupFormulaHint;
};

export type PodPricingSnapshotPersisted = {
  pricingRule: string;
  areaM2: number;
  dealerPrice: number;
  retailPrice: number;
  finalPrice: number;
  currency: string;
  timestamp: number;
};

export type PodCoreHistoryPersisted = {
  undoStack: string[];
  redoStack: string[];
  entries: PodCoreHistoryEntry[];
};

export type PodCoreExportSettings = {
  dpi: ExportDpi;
  crop: ExportCropMode;
};

export type PodCoreProductionPackMeta = {
  designerVersion: string;
  canvasVersion: string;
  template: { id: string; name: string; category: string; variantId: string };
  variant: string;
  dimensions: { widthCm: number; heightCm: number; quantity: number };
  dpi: ExportDpi;
  exportMode: ExportCropMode;
  createdAt: string;
  pricing: PodPricingSnapshotPersisted | null;
};

export type PodCoreProductionPackStored = {
  designJson: string;
  previewPngBase64: string;
  productionPngBase64: string;
  productionPdfBase64: string;
  metadataJson: PodCoreProductionPackMeta;
  pricingSnapshot: PodPricingSnapshotPersisted | null;
  exportSettings: PodCoreExportSettings;
  templateInfo: MockupTemplate;
};

export type PodCoreProjectRecord = {
  serializerVersion: typeof PROJECT_SERIALIZER_VERSION;
  projectId: string;
  projectName: string;
  ownerUserId: string;
  templateId: string;
  mockupTemplate: MockupTemplate;
  design: PodCoreDocument;
  widthCm: number;
  heightCm: number;
  quantity: number;
  customerType: import("@/lib/pricing-engine/pricing-types").PricingCustomerType;
  pricingSnapshot: PodPricingSnapshotPersisted | null;
  history: PodCoreHistoryPersisted;
  exportSettings: PodCoreExportSettings;
  overlayVisibility: PodOverlayVisibility;
  clipEnabled: boolean;
  productionPack: PodCoreProductionPackStored | null;
  exportCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PodPricingSnapshot = {
  areaM2: number;
  ruleCode: string;
  ruleName?: string;
  retailPrice: number;
  dealerPrice: number;
  finalPrice: number;
  materialCost: number;
  laborCost: number;
  printCost: number;
  wasteCost: number;
  commissionAmount: number;
  taxAmount: number;
  currency: string;
  breakdown: Array<{ key: string; label: string; amount: number }>;
  calculationTimeMs: number;
};

export type MockupFitMode = "contain" | "cover";
export type ExportCropMode = "full" | "print" | "safe" | "bleed";
export type ExportDpi = 300 | 600;

export const POD_CORE_DEFAULTS = {
  width: 800,
  height: 600,
  backgroundColor: "#ffffff",
  zoom: 1,
  minZoom: 0.25,
  maxZoom: 4,
  historyLimit: 50,
  defaultDpi: 300 as ExportDpi,
  defaultBleedPx: 12,
  defaultSafeMarginPx: 16,
} as const;

export const POD_OVERLAY_COLORS = {
  printable: "rgba(16, 185, 129, 0.85)",
  safe: "rgba(59, 130, 246, 0.75)",
  bleed: "rgba(239, 68, 68, 0.65)",
  grid: "rgba(148, 163, 184, 0.35)",
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
