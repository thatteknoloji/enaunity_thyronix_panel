import type { Canvas } from "fabric";
import {
  POD_CORE_VERSION,
  createEmptyDocument,
  type PodCoreDocument,
  type PodCoreViewport,
} from "./pod-types";

export function serializeCanvas(
  canvas: Canvas | null,
  viewport: PodCoreViewport
): PodCoreDocument {
  if (!canvas) return createEmptyDocument();
  const fabricJson = canvas.toJSON() as Record<string, unknown>;
  return {
    version: POD_CORE_VERSION,
    width: canvas.width ?? 800,
    height: canvas.height ?? 600,
    backgroundColor: String(canvas.backgroundColor ?? "#ffffff"),
    viewport,
    fabricJson,
  };
}

export function documentToJsonString(doc: PodCoreDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function parseDocumentJson(raw: string): PodCoreDocument {
  const parsed = JSON.parse(raw) as Partial<PodCoreDocument>;
  if (!parsed.fabricJson || typeof parsed.fabricJson !== "object") {
    throw new Error("Geçersiz POD Core belgesi: fabricJson eksik");
  }
  return {
    version: POD_CORE_VERSION,
    width: Number(parsed.width ?? 800),
    height: Number(parsed.height ?? 600),
    backgroundColor: String(parsed.backgroundColor ?? "#ffffff"),
    viewport: parsed.viewport ?? { zoom: 1, panX: 0, panY: 0 },
    fabricJson: parsed.fabricJson as Record<string, unknown>,
  };
}

export async function restoreCanvasFromDocument(
  canvas: Canvas | null,
  doc: PodCoreDocument
): Promise<PodCoreViewport> {
  if (!canvas) return doc.viewport;
  await canvas.loadFromJSON(doc.fabricJson);
  canvas.setDimensions({ width: doc.width, height: doc.height });
  canvas.backgroundColor = doc.backgroundColor;
  canvas.requestRenderAll();
  return doc.viewport;
}

export function canvasToHistorySnapshot(
  canvas: Canvas | null,
  viewport: PodCoreViewport
): string {
  return JSON.stringify(serializeCanvas(canvas, viewport));
}

export function parseHistorySnapshot(raw: string): {
  doc: PodCoreDocument;
  viewport: PodCoreViewport;
} {
  const doc = parseDocumentJson(raw);
  return { doc, viewport: doc.viewport };
}
