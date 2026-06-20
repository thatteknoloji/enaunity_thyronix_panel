import sharp from "sharp";

export type OptimizedImage = {
  buffer: Buffer;
  ext: "webp" | "jpg" | "png";
  mime: string;
  width: number;
  height: number;
};

const MAX_INPUT_BYTES = 30 * 1024 * 1024;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const WEBP_QUALITY = 82;

export function assertImageUploadSize(size: number) {
  if (size > MAX_INPUT_BYTES) {
    throw new Error(`Görsel en fazla ${Math.round(MAX_INPUT_BYTES / 1024 / 1024)} MB olabilir`);
  }
}

export async function optimizeContentImage(input: Buffer, originalName = "image"): Promise<OptimizedImage> {
  const image = sharp(input, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  let pipeline = image;
  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    pipeline = pipeline.resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const lower = originalName.toLowerCase();
  const keepPng = lower.endsWith(".png") && meta.hasAlpha;

  if (keepPng) {
    const buffer = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
    const outMeta = await sharp(buffer).metadata();
    return {
      buffer,
      ext: "png",
      mime: "image/png",
      width: outMeta.width || width,
      height: outMeta.height || height,
    };
  }

  const buffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
  const outMeta = await sharp(buffer).metadata();
  return {
    buffer,
    ext: "webp",
    mime: "image/webp",
    width: outMeta.width || width,
    height: outMeta.height || height,
  };
}
