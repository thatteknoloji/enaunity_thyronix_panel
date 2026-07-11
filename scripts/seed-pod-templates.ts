/**
 * Seed POD product templates with generated placeholder base images.
 * Run: npx tsx scripts/seed-pod-templates.ts
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "../src/lib/db";

const TEMPLATES = [
  { name: "Cam Tablo 30x45", slug: "cam-tablo-30x45", category: "Cam Tablo", printWidth: 30, printHeight: 45, w: 600, h: 900 },
  { name: "Cam Tablo 60x90", slug: "cam-tablo-60x90", category: "Cam Tablo", printWidth: 60, printHeight: 90, w: 800, h: 1200 },
  { name: "Poster A3", slug: "poster-a3", category: "Poster", printWidth: 29.7, printHeight: 42, w: 700, h: 990 },
  { name: "Kupa", slug: "kupa", category: "Kupa", printWidth: 20, printHeight: 9, w: 800, h: 360 },
  { name: "Tişört", slug: "tisort", category: "Tişört", printWidth: 30, printHeight: 40, w: 700, h: 900 },
];

async function createBaseImage(slug: string, w: number, h: number, color: string) {
  const dir = path.join(process.cwd(), "public", "uploads", "pod", "templates");
  await mkdir(dir, { recursive: true });
  const buf = await sharp({
    create: { width: w, height: h, channels: 3, background: color },
  })
    .png()
    .toBuffer();
  const file = `${slug}.png`;
  await writeFile(path.join(dir, file), buf);
  return `/uploads/pod/templates/${file}`;
}

async function main() {
  const colors = ["#e8e4df", "#d4d8dc", "#f5f0e8", "#ffffff", "#1a1a2e"];
  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i]!;
    const baseImageUrl = await createBaseImage(t.slug, t.w, t.h, colors[i % colors.length]!);
    const overlayW = Math.round(t.w * 0.55);
    const overlayH = Math.round(t.h * 0.55);
    const overlayAreaJson = JSON.stringify({
      x: Math.round((t.w - overlayW) / 2),
      y: Math.round((t.h - overlayH) / 2),
      width: overlayW,
      height: overlayH,
    });
    const safeAreaJson = JSON.stringify({
      x: Math.round((t.w - overlayW) / 2) + 20,
      y: Math.round((t.h - overlayH) / 2) + 20,
      width: overlayW - 40,
      height: overlayH - 40,
    });

    await prisma.pODProductTemplate.upsert({
      where: { slug: t.slug },
      create: {
        name: t.name,
        slug: t.slug,
        category: t.category,
        baseImageUrl,
        printWidth: t.printWidth,
        printHeight: t.printHeight,
        overlayAreaJson,
        safeAreaJson,
        status: "active",
        basePrice: 199 + i * 50,
      },
      update: {
        name: t.name,
        category: t.category,
        baseImageUrl,
        printWidth: t.printWidth,
        printHeight: t.printHeight,
        overlayAreaJson,
        safeAreaJson,
        status: "active",
      },
    });
    console.log(`✓ ${t.name}`);
  }
  console.log("\nPOD templates seeded.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
