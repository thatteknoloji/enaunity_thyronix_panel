import type { MockupFitMode, MockupTemplate } from "./pod-types";
import { alignRectInArea } from "./print-area-engine";

export type MockupCompositeOptions = {
  fit?: MockupFitMode;
  opacity?: number;
  overlay?: boolean;
  shadow?: boolean;
  blend?: GlobalCompositeOperation;
  zoom?: number;
};

export type MockupCompositeResult = {
  dataUrl: string;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Mockup görseli yüklenemedi"));
    img.src = src;
  });
}

export async function compositeMockupPreview(
  designDataUrl: string,
  template: MockupTemplate,
  options: MockupCompositeOptions = {}
): Promise<MockupCompositeResult> {
  const fit = options.fit ?? "contain";
  const opacity = options.opacity ?? 1;
  const zoom = options.zoom ?? 1;
  const blend = options.blend ?? "source-over";

  const [templateImg, designImg] = await Promise.all([
    loadImage(template.image),
    loadImage(designDataUrl),
  ]);

  const w = Math.round(template.width * zoom);
  const h = Math.round(template.height * zoom);
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const ctx = off.getContext("2d");
  if (!ctx) throw new Error("Canvas context oluşturulamadı");

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(templateImg, 0, 0, w, h);

  const pa = template.printArea;
  const area = {
    x: pa.x * zoom,
    y: pa.y * zoom,
    width: pa.width * zoom,
    height: pa.height * zoom,
    rotation: pa.rotation,
    scale: pa.scale,
  };

  const placement = alignRectInArea(
    { width: designImg.naturalWidth, height: designImg.naturalHeight },
    area,
    fit
  );

  ctx.save();
  if (options.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
  }
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = blend;

  if (placement.rotation) {
    const cx = placement.x + placement.width / 2;
    const cy = placement.y + placement.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((placement.rotation * Math.PI) / 180);
    ctx.drawImage(
      designImg,
      -placement.width / 2,
      -placement.height / 2,
      placement.width,
      placement.height
    );
  } else {
    ctx.drawImage(designImg, placement.x, placement.y, placement.width, placement.height);
  }
  ctx.restore();

  if (options.overlay) {
    ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(area.x, area.y, area.width, area.height);
  }

  return {
    dataUrl: off.toDataURL("image/png"),
    width: w,
    height: h,
  };
}

export async function compositeMockupFromCanvas(
  designCanvas: HTMLCanvasElement,
  template: MockupTemplate,
  options?: MockupCompositeOptions
): Promise<MockupCompositeResult> {
  return compositeMockupPreview(designCanvas.toDataURL("image/png"), template, options);
}
