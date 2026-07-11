/**
 * Bayi Cam Tablo: ebat varyantları + imla düzeltme + görseller + slug
 * Kullanım: npx tsx scripts/seed-bayi-cam-tablo-full.ts
 */
import { PrismaClient } from "@prisma/client";
import { CAM_TABLO_EBAT_PRESET, normalizeVariantOptionValue } from "../src/lib/products/cam-tablo-ebat";
import { ensureProductSlug } from "../src/lib/products/slug";

const prisma = new PrismaClient();

const GROUP_NAME = "Ebat";
const IMAGE_PATHS = [
  "/uploads/products/bayi-cam-tablo/01-hero.png",
  "/uploads/products/bayi-cam-tablo/02-ozellikler.png",
  "/uploads/products/bayi-cam-tablo/03-ebat-secenekleri.png",
  "/uploads/products/bayi-cam-tablo/04-kullanim-alanlari.png",
  "/uploads/products/bayi-cam-tablo/05-neden-cam-tablo.png",
  "/uploads/products/bayi-cam-tablo/06-4mm-rozet.png",
];

function cartesian<T>(arrays: T[][]): T[][] {
  if (!arrays.length) return [[]];
  const rest = cartesian(arrays.slice(1));
  const out: T[][] = [];
  for (const item of arrays[0]) {
    for (const r of rest) out.push([item, ...r]);
  }
  return out;
}

async function findProduct() {
  return (
    (await prisma.product.findFirst({ where: { barcode: "282045228361" } })) ||
    (await prisma.product.findFirst({ where: { sku: "CAM-BAY-PXOY" } })) ||
    (await prisma.product.findFirst({ where: { name: { contains: "Bayi Cam Tablo" } } }))
  );
}

async function main() {
  const product = await findProduct();
  if (!product) {
    console.error("Ürün bulunamadı (barkod: 282045228361, SKU: CAM-BAY-PXOY)");
    process.exit(1);
  }

  const slug = await ensureProductSlug(product.name, product.sku, product.id);
  await prisma.product.update({
    where: { id: product.id },
    data: {
      slug,
      image: IMAGE_PATHS[0],
      images: JSON.stringify(IMAGE_PATHS),
      brand: product.brand || "Ena Unity",
      category: product.category || "Cam Tablo",
      variantDisplayMode: product.variantDisplayMode || "select",
    },
  });
  console.log("✓ Ürün güncellendi:", product.name, "→", slug);

  // Fix existing option typos
  const groups = await prisma.variantGroup.findMany({
    where: { productId: product.id },
    include: { options: true },
  });
  for (const g of groups) {
    for (const opt of g.options) {
      const fixed = normalizeVariantOptionValue(opt.value);
      if (fixed !== opt.value) {
        await prisma.variantOption.update({ where: { id: opt.id }, data: { value: fixed } });
      }
    }
  }

  const variants = await prisma.variant.findMany({ where: { productId: product.id } });
  for (const v of variants) {
    try {
      const opts = JSON.parse(v.options || "[]") as Array<{ group: string; value: string }>;
      const next = opts.map((o) => ({ ...o, value: normalizeVariantOptionValue(o.value) }));
      if (JSON.stringify(next) !== v.options) {
        await prisma.variant.update({ where: { id: v.id }, data: { options: JSON.stringify(next) } });
      }
    } catch {
      /* ignore */
    }
  }

  let group = await prisma.variantGroup.findFirst({
    where: { productId: product.id, name: GROUP_NAME },
  });
  if (!group) {
    group = await prisma.variantGroup.create({
      data: { productId: product.id, name: GROUP_NAME },
    });
  }

  const ebatOptions = CAM_TABLO_EBAT_PRESET.map((v) => normalizeVariantOptionValue(v));
  for (let i = 0; i < ebatOptions.length; i++) {
    const value = ebatOptions[i];
    const existing = await prisma.variantOption.findFirst({
      where: { groupId: group.id, value },
    });
    if (!existing) {
      await prisma.variantOption.create({
        data: { groupId: group.id, value, sortOrder: i },
      });
    }
  }

  const existingVariants = await prisma.variant.findMany({ where: { productId: product.id } });
  const existingSet = new Set(existingVariants.map((v) => v.options));
  let created = 0;

  for (const value of ebatOptions) {
    const optsStr = JSON.stringify([{ group: GROUP_NAME, value }]);
    if (existingSet.has(optsStr)) continue;

    const skuSuffix = value.toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "");
    await prisma.variant.create({
      data: {
        productId: product.id,
        sku: `${product.sku || "CAM-BAY"}-${skuSuffix}`.slice(0, 80),
        barcode: `2${Date.now().toString().slice(-11)}${Math.random().toString(36).slice(2, 5)}`,
        price: product.price,
        stock: 0,
        options: optsStr,
        active: true,
      },
    });
    created++;
  }

  console.log(`✓ ${ebatOptions.length} ebat seçeneği, ${created} yeni varyant kombinasyonu`);
  console.log("✓ URL: /products/" + slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
