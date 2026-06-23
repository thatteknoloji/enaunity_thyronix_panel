/**
 * POD_DESIGNER_V1 tests
 * Run: npm run test:pod-designer
 */
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "../src/lib/db";
import { processDesignUpload, publicPathFromUrl } from "../src/lib/pod/upload";
import {
  normalizePlacement,
  serializePlacement,
  placementFromJson,
} from "../src/lib/pod/pod-design-engine";
import { generateProjectMockups } from "../src/lib/pod/pod-mockup-generator";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

async function seedTemplate() {
  const dir = path.join(process.cwd(), "public", "uploads", "pod", "templates");
  await mkdir(dir, { recursive: true });
  const slug = `test-template-${Date.now()}`;
  const buf = await sharp({
    create: { width: 600, height: 800, channels: 3, background: "#e8e4df" },
  })
    .png()
    .toBuffer();
  const file = `${slug}.png`;
  await writeFile(path.join(dir, file), buf);
  const baseImageUrl = `/uploads/pod/templates/${file}`;
  const overlayAreaJson = JSON.stringify({ x: 120, y: 160, width: 360, height: 480 });

  return prisma.pODProductTemplate.create({
    data: {
      name: "Test Cam Tablo",
      slug,
      category: "Test",
      baseImageUrl,
      printWidth: 30,
      printHeight: 45,
      overlayAreaJson,
      status: "active",
    },
  });
}

async function makePngFile(): Promise<File> {
  const buf = await sharp({
    create: { width: 400, height: 300, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(buf)], "test-design.png", { type: "image/png" });
}

async function makeSvgFile(): Promise<File> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="80" fill="blue"/></svg>`;
  return new File([Buffer.from(svg)], "test-design.svg", { type: "image/svg+xml" });
}

const dealerId = `test-dealer-${Date.now()}`;

console.log("\n=== POD_DESIGNER_V1 Tests ===\n");

try {
  const template = await seedTemplate();

  console.log("PNG upload:");
  const pngFile = await makePngFile();
  const pngProcessed = await processDesignUpload(pngFile, dealerId);
  assert(pngProcessed.fileType === "PNG", "PNG fileType");
  assert(pngProcessed.thumbnailUrl.includes("-thumb"), "PNG thumbnail oluştu");
  assert(pngProcessed.previewUrl.includes("-preview"), "PNG preview oluştu");
  assert(pngProcessed.width === 400, "PNG width");
  assert(pngProcessed.transparentBackground === true, "Şeffaf arkaplan algılandı");

  const pngDesign = await prisma.pODDesign.create({
    data: {
      dealerId,
      creatorUserId: "test-user",
      title: "Test PNG",
      fileUrl: pngProcessed.fileUrl,
      previewUrl: pngProcessed.previewUrl,
      thumbnailUrl: pngProcessed.thumbnailUrl,
      fileType: pngProcessed.fileType,
      width: pngProcessed.width,
      height: pngProcessed.height,
      dpi: pngProcessed.dpi,
      transparentBackground: pngProcessed.transparentBackground,
      status: "active",
    },
  });

  console.log("\nSVG upload:");
  const svgFile = await makeSvgFile();
  const svgProcessed = await processDesignUpload(svgFile, dealerId);
  assert(svgProcessed.fileType === "SVG", "SVG fileType");
  assert(svgProcessed.fileUrl.endsWith(".svg"), "SVG dosya kaydedildi");

  console.log("\nPlacement:");
  const placement = normalizePlacement({ x: 10, y: 20, scale: 0.9, rotation: 15 });
  const placementJson = serializePlacement(placement);
  const parsed = placementFromJson(placementJson);
  assert(parsed.x === 10 && parsed.scale === 0.9, "Placement kaydedilir/okunur");

  const project = await prisma.pODProject.create({
    data: {
      dealerId,
      designId: pngDesign.id,
      templateId: template.id,
      placementJson,
      status: "DRAFT",
    },
  });
  assert(!!project.id, "Proje oluşturuldu");

  console.log("\nMockup generate:");
  const updated = await generateProjectMockups(project.id, dealerId);
  assert(updated.mockupUrl.length > 0, "Mockup URL oluştu");
  assert(updated.previewUrl.length > 0, "Preview URL oluştu");
  assert(updated.mockupThumbnailUrl.length > 0, "Thumbnail mockup oluştu");
  assert(updated.status === "MOCKUP_READY", "Status MOCKUP_READY");

  const mockupPath = publicPathFromUrl(updated.mockupUrl);
  const { access } = await import("fs/promises").then((fs) =>
    fs.access(mockupPath).then(() => ({ access: true })).catch(() => ({ access: false }))
  );
  assert(access, "Mockup dosyası diskte var");

  console.log("\nStore ready:");
  const storeReady = await prisma.pODProject.update({
    where: { id: project.id },
    data: { status: "STORE_READY" },
  });
  assert(storeReady.status === "STORE_READY", "STORE_READY çalışır");

  console.log(`\n=== Sonuç: ${passed} passed, ${failed} failed ===\n`);

  await prisma.pODProject.delete({ where: { id: project.id } });
  await prisma.pODDesign.delete({ where: { id: pngDesign.id } });
  await prisma.pODProductTemplate.delete({ where: { id: template.id } });
  await rm(path.join(process.cwd(), "public", "uploads", "pod", dealerId), { recursive: true, force: true });

  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
