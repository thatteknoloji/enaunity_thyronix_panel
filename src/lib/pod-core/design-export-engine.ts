import type { Canvas } from "fabric";
import { jsPDF } from "jspdf";
import { cropRectForMode } from "./print-area-engine";
import { isSystemObject } from "./print-area-overlay";
import {
  POD_CORE_VERSION,
  createEmptyDocument,
  type ExportCropMode,
  type ExportDpi,
  type PodCoreDocument,
  type PodCoreViewport,
  type PodPrintAreaBundle,
} from "./pod-types";

const SCREEN_DPI = 96;

export function serializeCanvas(
  canvas: Canvas | null,
  viewport: PodCoreViewport,
  templateId?: string
): PodCoreDocument {
  if (!canvas) return createEmptyDocument();
  const fabricJson = canvasToExportableJson(canvas);
  return {
    version: POD_CORE_VERSION,
    width: canvas.width ?? 800,
    height: canvas.height ?? 600,
    backgroundColor: String(canvas.backgroundColor ?? "#ffffff"),
    viewport,
    fabricJson,
    templateId,
  };
}

export function canvasToExportableJson(canvas: Canvas): Record<string, unknown> {
  const base = canvas.toJSON() as Record<string, unknown>;
  const objects = canvas
    .getObjects()
    .filter((o) => !isSystemObject(o))
    .map((o) => o.toObject());
  return { ...base, objects };
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
    templateId: parsed.templateId,
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
  viewport: PodCoreViewport,
  templateId?: string
): string {
  return JSON.stringify(serializeCanvas(canvas, viewport, templateId));
}

export function parseHistorySnapshot(raw: string): {
  doc: PodCoreDocument;
  viewport: PodCoreViewport;
} {
  const doc = parseDocumentJson(raw);
  return { doc, viewport: doc.viewport };
}

export type RasterExportOptions = {
  crop?: ExportCropMode;
  bundle?: PodPrintAreaBundle | null;
  dpi?: ExportDpi;
  transparent?: boolean;
  multiplier?: number;
};

function resolveCropRect(
  canvas: Canvas,
  options: RasterExportOptions
): { left: number; top: number; width: number; height: number } {
  if (!options.bundle || options.crop === "full" || !options.crop) {
    return { left: 0, top: 0, width: canvas.width ?? 800, height: canvas.height ?? 600 };
  }
  const mode =
    options.crop === "print" ? "print" : options.crop === "safe" ? "safe" : "bleed";
  const rect = cropRectForMode(options.bundle, mode);
  return { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
}

function resolveMultiplier(dpi: ExportDpi, override?: number): number {
  if (override) return override;
  return dpi / SCREEN_DPI;
}

export async function exportCanvasPng(
  canvas: Canvas,
  options: RasterExportOptions = {}
): Promise<Blob> {
  const dpi = options.dpi ?? 300;
  const crop = resolveCropRect(canvas, options);
  const multiplier = resolveMultiplier(dpi, options.multiplier);
  const prevBg = canvas.backgroundColor;

  if (options.transparent) {
    canvas.backgroundColor = "transparent";
  }

  const overlays = canvas.getObjects().filter(isSystemObject);
  overlays.forEach((o) => o.set("visible", false));
  canvas.requestRenderAll();

  const dataUrl = canvas.toDataURL({
    format: "png",
    left: crop.left,
    top: crop.top,
    width: crop.width,
    height: crop.height,
    multiplier,
    enableRetinaScaling: true,
  });

  overlays.forEach((o) => o.set("visible", true));
  canvas.backgroundColor = prevBg;
  canvas.requestRenderAll();

  const res = await fetch(dataUrl);
  return res.blob();
}

export async function exportCanvasSvg(
  canvas: Canvas,
  options: Pick<RasterExportOptions, "crop" | "bundle"> = {}
): Promise<string> {
  const crop = resolveCropRect(canvas, options);
  const overlays = canvas.getObjects().filter(isSystemObject);
  overlays.forEach((o) => o.set("visible", false));
  canvas.requestRenderAll();

  const svg = canvas.toSVG({
    viewBox: {
      x: crop.left,
      y: crop.top,
      width: crop.width,
      height: crop.height,
    },
  });

  overlays.forEach((o) => o.set("visible", true));
  canvas.requestRenderAll();
  return svg;
}

export async function exportCanvasPdf(
  canvas: Canvas,
  options: RasterExportOptions = {}
): Promise<Blob> {
  const dpi = options.dpi ?? 300;
  const pngBlob = await exportCanvasPng(canvas, { ...options, dpi, transparent: false });
  const pngDataUrl = await blobToDataUrl(pngBlob);
  const crop = resolveCropRect(canvas, options);
  const multiplier = resolveMultiplier(dpi, options.multiplier);
  const wMm = (crop.width * multiplier * 25.4) / dpi;
  const hMm = (crop.height * multiplier * 25.4) / dpi;

  const pdf = new jsPDF({
    orientation: wMm > hMm ? "landscape" : "portrait",
    unit: "mm",
    format: [wMm, hMm],
  });
  pdf.addImage(pngDataUrl, "PNG", 0, 0, wMm, hMm);
  return pdf.output("blob");
}

export type ProductionMetadata = {
  version: typeof POD_CORE_VERSION;
  dpi: ExportDpi;
  cropMode: ExportCropMode;
  printable: PodPrintAreaBundle["printable"];
  safe: PodPrintAreaBundle["safe"];
  bleed: PodPrintAreaBundle["bleed"];
  exportWidthPx: number;
  exportHeightPx: number;
  createdAt: string;
  templateId?: string;
};

export type ProductionFileBundle = {
  preview: Blob;
  production: Blob;
  productionPdf: Blob;
  metadata: ProductionMetadata;
};

export async function createProductionFile(
  canvas: Canvas,
  bundle: PodPrintAreaBundle,
  options: {
    dpi?: ExportDpi;
    crop?: ExportCropMode;
    templateId?: string;
    transparentProduction?: boolean;
  } = {}
): Promise<ProductionFileBundle> {
  const dpi = options.dpi ?? 300;
  const crop = options.crop ?? "print";
  const cropRect = resolveCropRect(canvas, { crop, bundle });
  const multiplier = resolveMultiplier(dpi);

  const preview = await exportCanvasPng(canvas, {
    crop: "print",
    bundle,
    dpi: 300,
    transparent: false,
    multiplier: 1.5,
  });

  const production = await exportCanvasPng(canvas, {
    crop,
    bundle,
    dpi,
    transparent: options.transparentProduction ?? true,
  });

  const productionPdf = await exportCanvasPdf(canvas, { crop, bundle, dpi });

  const metadata: ProductionMetadata = {
    version: POD_CORE_VERSION,
    dpi,
    cropMode: crop,
    printable: bundle.printable,
    safe: bundle.safe,
    bleed: bundle.bleed,
    exportWidthPx: Math.round(cropRect.width * multiplier),
    exportHeightPx: Math.round(cropRect.height * multiplier),
    createdAt: new Date().toISOString(),
    templateId: options.templateId,
  };

  return { preview, production, productionPdf, metadata };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadProductionBundle(bundle: ProductionFileBundle, prefix = "ena-pod"): void {
  const ts = Date.now();
  downloadBlob(bundle.preview, `${prefix}-preview-${ts}.png`);
  downloadBlob(bundle.production, `${prefix}-production-${ts}.png`);
  downloadBlob(bundle.productionPdf, `${prefix}-production-${ts}.pdf`);
  const metaBlob = new Blob([JSON.stringify(bundle.metadata, null, 2)], { type: "application/json" });
  downloadBlob(metaBlob, `${prefix}-metadata-${ts}.json`);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Offscreen canvas export for mockup pipeline */
export async function exportDesignRegionDataUrl(
  canvas: Canvas,
  bundle: PodPrintAreaBundle,
  crop: ExportCropMode = "print"
): Promise<string> {
  const blob = await exportCanvasPng(canvas, { crop, bundle, dpi: 300, transparent: true });
  return blobToDataUrl(blob);
}
