export type PodProductShape = "RECTANGLE" | "CIRCLE" | "SQUARE" | "MULTI_PART" | "WRAP" | "PUZZLE";

export type PodPrintAreaMode = "RECTANGLE" | "CIRCLE" | "FABRIC_PANEL";

export type PodMockupType =
  | "GLASS_RECTANGLE"
  | "GLASS_CIRCLE"
  | "MDF_RECTANGLE"
  | "PUZZLE_GRID"
  | "CARPET_ROOM"
  | "RUG_ROOM"
  | "CURTAIN_WINDOW"
  | "PILLOW"
  | "BEDDING_SET"
  | "POSTER_FRAME"
  | "MUG_WRAP"
  | "CANVAS_STRETCH"
  | "APPAREL_FRONT";

export type PodExportMode = "PRINT_AREA" | "CIRCULAR_CLIP" | "MULTI_PART" | "WRAP";

export type PodEditorPlugin = "standard" | "fabric-panel" | "multi-part" | "wrap";

export type PodProductProfile = {
  id: string;
  name: string;
  category: string;
  templateType: string;
  templateId: string;
  catalogId?: string;
  pricingRuleCode: string;
  defaultSize: { widthCm: number; heightCm: number };
  defaultSizeVariantKey?: string;
  defaultQuantity: number;
  shape: PodProductShape;
  allowedOrientations: Array<"landscape" | "portrait">;
  printAreaMode: PodPrintAreaMode;
  mockupType: PodMockupType;
  editorPlugin: PodEditorPlugin;
  exportMode: PodExportMode;
  formulaHint: "AREA" | "PIECE";
  materialCode: string;
  variantId: string;
  options?: string[];
  warnings?: string[];
  status: "active" | "beta";
};
