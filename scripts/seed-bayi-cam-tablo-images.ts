/**
 * Bayi Cam Tablo ürününe görselleri ve slug'ı yükler.
 * Kullanım: npx tsx scripts/seed-bayi-cam-tablo-images.ts
 */
import { PrismaClient } from "@prisma/client";
import { ensureProductSlug } from "../src/lib/products/slug";

const prisma = new PrismaClient();

const IMAGE_PATHS = [
  "/uploads/products/bayi-cam-tablo/01-hero.png",
  "/uploads/products/bayi-cam-tablo/02-ozellikler.png",
  "/uploads/products/bayi-cam-tablo/03-ebat-secenekleri.png",
  "/uploads/products/bayi-cam-tablo/04-kullanim-alanlari.png",
  "/uploads/products/bayi-cam-tablo/05-neden-cam-tablo.png",
  "/uploads/products/bayi-cam-tablo/06-4mm-rozet.png",
];

async function main() {
  const product =
    (await prisma.product.findFirst({ where: { barcode: "282045228361" } })) ||
    (await prisma.product.findFirst({ where: { sku: "CAM-BAY-PXOY" } })) ||
    (await prisma.product.findFirst({ where: { name: { contains: "Bayi Cam Tablo" } } }));

  if (!product) {
    console.error("Ürün bulunamadı (barkod: 282045228361, SKU: CAM-BAY-PXOY)");
    process.exit(1);
  }

  const slug = await ensureProductSlug(product.name, product.sku, product.id);
  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      slug,
      image: IMAGE_PATHS[0],
      images: JSON.stringify(IMAGE_PATHS),
      brand: product.brand || "Ena Unity",
    },
  });

  console.log("Güncellendi:", updated.name);
  console.log("ID:", updated.id);
  console.log("Slug:", updated.slug);
  console.log("Görsel sayısı:", IMAGE_PATHS.length);
  console.log("URL: /products/" + updated.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
