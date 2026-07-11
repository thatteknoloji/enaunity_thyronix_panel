import path from "path";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import {
  computeDesignDrawRect,
  overlayFromTemplate,
  placementFromJson,
} from "./pod-design-engine";
import { publicPathFromUrl, saveMockupBuffer } from "./upload";

export type MockupVariant = "thumbnail" | "preview" | "full";

const VARIANT_WIDTH: Record<MockupVariant, number | null> = {
  thumbnail: 400,
  preview: 800,
  full: null,
};

async function loadImageBuffer(fileUrl: string): Promise<Buffer> {
  const filePath = publicPathFromUrl(fileUrl);
  return sharp(filePath, { density: 300, failOn: "none" }).toBuffer();
}

export async function generateMockupComposite(opts: {
  templateBaseUrl: string;
  designFileUrl: string;
  designWidth: number;
  designHeight: number;
  overlayAreaJson: string;
  printWidth: number;
  printHeight: number;
  placementJson: string;
  variant?: MockupVariant;
}): Promise<Buffer> {
  const placement = placementFromJson(opts.placementJson);
  const overlay = overlayFromTemplate({
    overlayAreaJson: opts.overlayAreaJson,
    printWidth: opts.printWidth,
    printHeight: opts.printHeight,
  });

  const [baseBuf, designBuf] = await Promise.all([
    loadImageBuffer(opts.templateBaseUrl),
    loadImageBuffer(opts.designFileUrl),
  ]);

  const baseMeta = await sharp(baseBuf).metadata();
  const baseW = baseMeta.width || 800;
  const baseH = baseMeta.height || 800;

  const designMeta = await sharp(designBuf).metadata();
  const dW = opts.designWidth || designMeta.width || 500;
  const dH = opts.designHeight || designMeta.height || 500;

  const rect = computeDesignDrawRect(placement, dW, dH, overlay);

  let processedDesign = await sharp(designBuf)
    .resize(Math.round(rect.width), Math.round(rect.height), { fit: "fill" })
    .rotate(placement.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const rotatedMeta = await sharp(processedDesign).metadata();
  const rotW = rotatedMeta.width || rect.width;
  const rotH = rotatedMeta.height || rect.height;
  const left = Math.round(rect.left + (rect.width - rotW) / 2);
  const top = Math.round(rect.top + (rect.height - rotH) / 2);

  let pipeline = sharp(baseBuf).composite([
    { input: processedDesign, left: Math.max(0, left), top: Math.max(0, top) },
  ]);

  const variant = opts.variant || "full";
  const targetW = VARIANT_WIDTH[variant];
  if (targetW && baseW > targetW) {
    pipeline = pipeline.resize({ width: targetW, withoutEnlargement: true });
  }

  return pipeline.png({ compressionLevel: 8 }).toBuffer();
}

export async function generateProjectMockups(projectId: string, dealerId: string) {
  const project = await prisma.pODProject.findUnique({
    where: { id: projectId },
    include: { design: true, template: true },
  });
  if (!project) throw new Error("Proje bulunamadı");
  if (project.dealerId !== dealerId) throw new Error("Yetkisiz");
  if (!project.design.fileUrl) throw new Error("Tasarım dosyası yok");
  if (!project.template.baseImageUrl) throw new Error("Şablon görseli yok");

  const baseOpts = {
    templateBaseUrl: project.template.baseImageUrl,
    designFileUrl: project.design.fileUrl,
    designWidth: project.design.width,
    designHeight: project.design.height,
    overlayAreaJson: project.template.overlayAreaJson,
    printWidth: project.template.printWidth,
    printHeight: project.template.printHeight,
    placementJson: project.placementJson,
  };

  const [thumbBuf, previewBuf, fullBuf] = await Promise.all([
    generateMockupComposite({ ...baseOpts, variant: "thumbnail" }),
    generateMockupComposite({ ...baseOpts, variant: "preview" }),
    generateMockupComposite({ ...baseOpts, variant: "full" }),
  ]);

  const ts = Date.now();
  const [mockupThumbnailUrl, previewUrl, mockupUrl] = await Promise.all([
    saveMockupBuffer(dealerId, thumbBuf, `${ts}-thumb`),
    saveMockupBuffer(dealerId, previewBuf, `${ts}-preview`),
    saveMockupBuffer(dealerId, fullBuf, `${ts}-full`),
  ]);

  const updated = await prisma.pODProject.update({
    where: { id: projectId },
    data: {
      mockupThumbnailUrl,
      previewUrl,
      mockupUrl,
      status: "MOCKUP_READY",
    },
  });

  return updated;
}
