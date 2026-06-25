import type { PricingCustomerType } from "@/lib/pricing-engine/pricing-types";
import type { PodCanvasEngine } from "./canvas-engine";
import {
  DEFAULT_EXPORT_SETTINGS,
  buildProductionPackStored,
  deserializeDesignerState,
  historyEngineToPersisted,
  normalizeExportSettings,
  pricingToPersistedSnapshot,
  serializeDesignerState,
  type DesignerDeserializeResult,
} from "./project-serializer";
import type {
  MockupTemplate,
  PodCoreExportSettings,
  PodCoreProductionPackStored,
  PodCoreProjectRecord,
  PodPricingSnapshot,
} from "./pod-types";
import { POD_CORE_SOURCE } from "./pod-types";

export { POD_CORE_SOURCE };

export type PodOrderBridgeSaveInput = {
  ownerUserId: string;
  projectId?: string;
  projectName: string;
  engine: PodCanvasEngine;
  mockupTemplate: MockupTemplate;
  widthCm: number;
  heightCm: number;
  quantity: number;
  customerType: PricingCustomerType;
  pricing: PodPricingSnapshot | null;
  exportSettings?: PodCoreExportSettings;
  includeProductionPack?: boolean;
  exportCount?: number;
};

export type PodOrderBridgeSaveResult = {
  project: PodCoreProjectRecord;
  productionPack: PodCoreProductionPackStored | null;
};

export type PodOrderBridgeListItem = {
  projectId: string;
  projectName: string;
  templateId: string;
  templateName: string;
  updatedAt: string;
  pricingSnapshot: PodCoreProjectRecord["pricingSnapshot"];
};

export function isOrderBridgeReady(): boolean {
  return true;
}

export async function savePodCoreProject(input: PodOrderBridgeSaveInput): Promise<PodOrderBridgeSaveResult> {
  const exportSettings = normalizeExportSettings(input.exportSettings ?? DEFAULT_EXPORT_SETTINGS);
  const canvas = input.engine.canvas;
  const bundle = input.engine.getPrintAreaBundle();

  let productionPack: PodCoreProductionPackStored | null = null;
  if (input.includeProductionPack !== false && canvas && bundle) {
    const design = input.engine.serialize();
    const pricingSnapshot = pricingToPersistedSnapshot(input.pricing, input.mockupTemplate.pricingRuleCode);
    productionPack = await buildProductionPackStored(
      canvas,
      bundle,
      input.mockupTemplate,
      design,
      input.widthCm,
      input.heightCm,
      input.quantity,
      exportSettings,
      pricingSnapshot
    );
  }

  const document = serializeDesignerState({
    ownerUserId: input.ownerUserId,
    projectId: input.projectId,
    projectName: input.projectName,
    mockupTemplate: input.mockupTemplate,
    design: input.engine.serialize(),
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    quantity: input.quantity,
    customerType: input.customerType,
    pricing: input.pricing,
    history: historyEngineToPersisted(input.engine.history),
    exportSettings,
    overlayVisibility: input.engine.getOverlayVisibility(),
    clipEnabled: input.engine.isClipEnabled(),
    productionPack,
    exportCount: input.exportCount,
  });

  const res = await fetch("/api/pod/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: POD_CORE_SOURCE,
      action: "save",
      document,
    }),
  });

  const json = (await res.json()) as { success?: boolean; error?: string; data?: PodCoreProjectRecord };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || "Proje kaydedilemedi");
  }

  return { project: json.data, productionPack: json.data.productionPack };
}

export async function loadPodCoreProject(projectId: string): Promise<DesignerDeserializeResult> {
  const res = await fetch("/api/pod/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: POD_CORE_SOURCE,
      action: "load",
      projectId,
    }),
  });

  const json = (await res.json()) as { success?: boolean; error?: string; data?: PodCoreProjectRecord };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || "Proje yüklenemedi");
  }

  return deserializeDesignerState(json.data);
}

export async function listPodCoreProjects(): Promise<PodOrderBridgeListItem[]> {
  const res = await fetch(`/api/pod/projects?source=${POD_CORE_SOURCE}`);
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: { items: PodOrderBridgeListItem[] };
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || "Projeler alınamadı");
  }
  return json.data.items;
}

export async function duplicatePodCoreProject(
  projectId: string,
  projectName?: string
): Promise<PodCoreProjectRecord> {
  const res = await fetch("/api/pod/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: POD_CORE_SOURCE,
      action: "duplicate",
      projectId,
      projectName,
    }),
  });

  const json = (await res.json()) as { success?: boolean; error?: string; data?: PodCoreProjectRecord };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || "Proje kopyalanamadı");
  }
  return json.data;
}

export async function createProductionFileForProject(projectId: string): Promise<{
  projectId: string;
  files: Record<string, string | object | null>;
  exportCount: number;
}> {
  const res = await fetch("/api/pod/create-production-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });

  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: { projectId: string; files: Record<string, string | object | null>; exportCount: number };
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || "Production pack oluşturulamadı");
  }
  return json.data;
}

/** Designer state'i engine'e uygular */
export async function applyLoadedProject(
  engine: PodCanvasEngine,
  loaded: DesignerDeserializeResult
): Promise<void> {
  engine.setMockupTemplate(loaded.mockupTemplate);
  engine.setOverlayVisibility(loaded.overlayVisibility);
  engine.setClipEnabled(loaded.clipEnabled);
  await engine.loadDocument(loaded.design, loaded.history);
}
