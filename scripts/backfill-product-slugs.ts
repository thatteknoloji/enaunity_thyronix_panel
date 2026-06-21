/**
 * Boş slug'lı ürünlere slug atar.
 * Kullanım: npx tsx scripts/backfill-product-slugs.ts
 */
import { PrismaClient } from "@prisma/client";
import { ensureProductSlug } from "../src/lib/products/slug";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({ where: { slug: "" } });

  let updated = 0;
  for (const p of products) {
    const slug = await ensureProductSlug(p.name, p.sku, p.id);
    await prisma.product.update({ where: { id: p.id }, data: { slug } });
    updated++;
    console.log(`${p.name} -> ${slug}`);
  }

  console.log(`Toplam ${updated} ürün slug güncellendi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
