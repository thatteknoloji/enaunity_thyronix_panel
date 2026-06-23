import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { POD_MAX_UPLOAD_BYTES, type PodFileType } from "./types";

export function assertPodUploadSize(size: number) {
  if (size > POD_MAX_UPLOAD_BYTES) {
    throw new Error(`Dosya en fazla ${Math.round(POD_MAX_UPLOAD_BYTES / 1024 / 1024)} MB olabilir`);
  }
}

function podUploadDir(dealerId: string, sub: "designs" | "mockups") {
  return path.join(process.cwd(), "public", "uploads", "pod", dealerId, sub);
}

export type ProcessedDesignUpload = {
  fileUrl: string;
  previewUrl: string;
  thumbnailUrl: string;
  fileType: PodFileType;
  width: number;
  height: number;
  dpi: number;
  transparentBackground: boolean;
  fileSize: number;
};

export async function processDesignUpload(
  file: File,
  dealerId: string
): Promise<ProcessedDesignUpload> {
  assertPodUploadSize(file.size);

  const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");

  if (!isSvg && !isPng) {
    throw new Error("Sadece PNG veya SVG desteklenir");
  }

  const uploadDir = podUploadDir(dealerId, "designs");
  await mkdir(uploadDir, { recursive: true });

  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (isSvg) {
    const safeName = `${ts}.svg`;
    await writeFile(path.join(uploadDir, safeName), bytes);
    const url = `/uploads/pod/${dealerId}/designs/${safeName}`;
    return {
      fileUrl: url,
      previewUrl: url,
      thumbnailUrl: url,
      fileType: "SVG",
      width: 0,
      height: 0,
      dpi: 300,
      transparentBackground: true,
      fileSize: bytes.length,
    };
  }

  const image = sharp(bytes, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const transparentBackground = meta.hasAlpha === true;

  const originalName = `${ts}.png`;
  await writeFile(path.join(uploadDir, originalName), bytes);

  const thumbBuf = await image
    .clone()
    .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const thumbName = `${ts}-thumb.png`;
  await writeFile(path.join(uploadDir, thumbName), thumbBuf);

  const previewBuf = await image
    .clone()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 8 })
    .toBuffer();
  const previewName = `${ts}-preview.png`;
  await writeFile(path.join(uploadDir, previewName), previewBuf);

  const base = `/uploads/pod/${dealerId}/designs`;
  return {
    fileUrl: `${base}/${originalName}`,
    previewUrl: `${base}/${previewName}`,
    thumbnailUrl: `${base}/${thumbName}`,
    fileType: "PNG",
    width,
    height,
    dpi: meta.density ? Math.round(meta.density) : 300,
    transparentBackground,
    fileSize: bytes.length,
  };
}

export function publicPathFromUrl(url: string): string {
  if (url.startsWith("/uploads/")) {
    return path.join(process.cwd(), "public", url);
  }
  return url;
}

export async function saveMockupBuffer(
  dealerId: string,
  buffer: Buffer,
  suffix: string
): Promise<string> {
  const dir = podUploadDir(dealerId, "mockups");
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${suffix}.png`;
  await writeFile(path.join(dir, name), buffer);
  return `/uploads/pod/${dealerId}/mockups/${name}`;
}
