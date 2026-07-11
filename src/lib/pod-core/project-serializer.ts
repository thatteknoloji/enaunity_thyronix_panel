import type { PricingCustomerType } from "@/lib/pricing-engine/pricing-types";
import type { Canvas } from "fabric";
import {
  createProductionFile,
  documentToJsonString,
  parseDocumentJson,
} from "./design-export-engine";
import type { PodHistoryEngine } from "./history-engine";
import {
  POD_CORE_VERSION,
  PROJECT_SERIALIZER_VERSION,
  type ExportCropMode,
  type ExportDpi,
  type MockupTemplate,
  type PodCoreDocument,
  type PodCoreExportSettings,
  type PodCoreHistoryPersisted,
  type PodCoreProductionPackMeta,
  type PodCoreProductionPackStored,
  type PodCoreProjectRecord,
  type PodOverlayVisibility,
  type PodPricingSnapshot,
  type PodPricingSnapshotPersisted,
  type PodPrintAreaBundle,
} from "./pod-types";

export type DesignerSerializeInput = {
  ownerUserId: string;
  projectId?: string;
  projectName: string;
  mockupTemplate: MockupTemplate;
  design: PodCoreDocument;
  widthCm: number;
  heightCm: number;
  quantity: number;
  customerType: PricingCustomerType;
  pricing: PodPricingSnapshot | null;
  history: PodCoreHistoryPersisted;
  exportSettings: PodCoreExportSettings;
  overlayVisibility: PodOverlayVisibility;
  clipEnabled: boolean;
  productionPack?: PodCoreProductionPackStored | null;
  exportCount?: number;
  existingRecord?: PodCoreProjectRecord | null;
};

export type DesignerDeserializeResult = {
  record: PodCoreProjectRecord;
  design: PodCoreDocument;
  history: PodCoreHistoryPersisted;
  mockupTemplate: MockupTemplate;
  widthCm: number;
  heightCm: number;
  quantity: number;
  customerType: PricingCustomerType;
  pricingSnapshot: PodPricingSnapshotPersisted | null;
  exportSettings: PodCoreExportSettings;
  overlayVisibility: PodOverlayVisibility;
  clipEnabled: boolean;
};

export function pricingToPersistedSnapshot(
  pricing: PodPricingSnapshot | null,
  pricingRule: string
): PodPricingSnapshotPersisted | null {
  if (!pricing) return null;
  return {
    pricingRule,
    areaM2: pricing.areaM2,
    dealerPrice: pricing.dealerPrice,
    retailPrice: pricing.retailPrice,
    finalPrice: pricing.finalPrice,
    currency: pricing.currency,
    timestamp: Date.now(),
  };
}

export function historyEngineToPersisted(history: PodHistoryEngine): PodCoreHistoryPersisted {
  return history.exportState();
}

export function serializeDesignerState(input: DesignerSerializeInput): PodCoreProjectRecord {
  const now = new Date().toISOString();
  const projectId =
    input.projectId ||
    input.existingRecord?.projectId ||
    `pc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    serializerVersion: PROJECT_SERIALIZER_VERSION,
    projectId,
    projectName: input.projectName.trim() || "Adsız Proje",
    ownerUserId: input.ownerUserId,
    templateId: input.mockupTemplate.id,
    mockupTemplate: input.mockupTemplate,
    design: input.design,
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    quantity: input.quantity,
    customerType: input.customerType,
    pricingSnapshot: pricingToPersistedSnapshot(input.pricing, input.mockupTemplate.pricingRuleCode),
    history: input.history,
    exportSettings: input.exportSettings,
    overlayVisibility: input.overlayVisibility,
    clipEnabled: input.clipEnabled,
    productionPack: input.productionPack ?? input.existingRecord?.productionPack ?? null,
    exportCount: input.exportCount ?? input.existingRecord?.exportCount ?? 0,
    createdAt: input.existingRecord?.createdAt ?? now,
    updatedAt: now,
  };
}

export function deserializeDesignerState(raw: PodCoreProjectRecord): DesignerDeserializeResult {
  const design = parseDocumentJson(JSON.stringify(raw.design));
  return {
    record: raw,
    design,
    history: raw.history,
    mockupTemplate: raw.mockupTemplate,
    widthCm: raw.widthCm,
    heightCm: raw.heightCm,
    quantity: raw.quantity,
    customerType: raw.customerType,
    pricingSnapshot: raw.pricingSnapshot,
    exportSettings: raw.exportSettings,
    overlayVisibility: raw.overlayVisibility,
    clipEnabled: raw.clipEnabled,
  };
}

export function buildProductionMetadata(
  template: MockupTemplate,
  widthCm: number,
  heightCm: number,
  quantity: number,
  exportSettings: PodCoreExportSettings,
  pricingSnapshot: PodPricingSnapshotPersisted | null
): PodCoreProductionPackMeta {
  return {
    designerVersion: POD_CORE_VERSION,
    canvasVersion: POD_CORE_VERSION,
    template: {
      id: template.id,
      name: template.name,
      category: template.category,
      variantId: template.variantId,
    },
    variant: template.variant,
    dimensions: { widthCm, heightCm, quantity },
    dpi: exportSettings.dpi,
    exportMode: exportSettings.crop,
    createdAt: new Date().toISOString(),
    pricing: pricingSnapshot,
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Client-side — canvas üzerinden production pack üretir */
export async function buildProductionPackStored(
  canvas: Canvas,
  bundle: PodPrintAreaBundle,
  template: MockupTemplate,
  design: PodCoreDocument,
  widthCm: number,
  heightCm: number,
  quantity: number,
  exportSettings: PodCoreExportSettings,
  pricingSnapshot: PodPricingSnapshotPersisted | null
): Promise<PodCoreProductionPackStored> {
  const bundleResult = await createProductionFile(canvas, bundle, {
    dpi: exportSettings.dpi,
    crop: exportSettings.crop,
    templateId: template.id,
  });

  const metadataJson = buildProductionMetadata(
    template,
    widthCm,
    heightCm,
    quantity,
    exportSettings,
    pricingSnapshot
  );

  const [previewPngBase64, productionPngBase64, productionPdfBase64] = await Promise.all([
    blobToBase64(bundleResult.preview),
    blobToBase64(bundleResult.production),
    blobToBase64(bundleResult.productionPdf),
  ]);

  return {
    designJson: documentToJsonString(design),
    previewPngBase64,
    productionPngBase64,
    productionPdfBase64,
    metadataJson,
    pricingSnapshot,
    exportSettings,
    templateInfo: template,
  };
}

export function productionPackToFileMap(pack: PodCoreProductionPackStored): Record<string, string | object | null> {
  return {
    "design.json": pack.designJson,
    "preview.png": pack.previewPngBase64,
    "production.png": pack.productionPngBase64,
    "production.pdf": pack.productionPdfBase64,
    "metadata.json": pack.metadataJson,
    pricingSnapshot: pack.pricingSnapshot,
    exportSettings: pack.exportSettings,
    templateInfo: pack.templateInfo,
  };
}

export const DEFAULT_EXPORT_SETTINGS: PodCoreExportSettings = {
  dpi: 300,
  crop: "print" as ExportCropMode,
};

export function normalizeExportSettings(settings?: Partial<PodCoreExportSettings>): PodCoreExportSettings {
  return {
    dpi: (settings?.dpi ?? 300) as ExportDpi,
    crop: settings?.crop ?? "print",
  };
}
