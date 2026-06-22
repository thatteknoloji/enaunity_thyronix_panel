/**
 * Thyronix kaynaklarını temizler — yalnızca Bezos BAYİ XML kaynağı kalır.
 * Run: npx tsx scripts/cleanup-thyronix-sources-keep-bezos.ts
 */
import { prisma } from "../src/lib/db";

const BEZOS_SOURCE_ID = process.env.BEZOS_KEEP_SOURCE_ID?.trim();

async function auditBezosStock(sourceId: string) {
  const total = await prisma.thyronixProduct.count({ where: { sourceId } });
  const zeroStock = await prisma.thyronixProduct.count({
    where: { sourceId, stock: { equals: 0 } },
  });
  const positiveStock = await prisma.thyronixProduct.count({
    where: { sourceId, stock: { gt: 0 } },
  });
  const agg = await prisma.thyronixProduct.aggregate({
    where: { sourceId },
    _min: { stock: true },
    _max: { stock: true },
    _avg: { stock: true },
  });

  const bookWhere = {
    sourceId,
    OR: [
      { category: { equals: "Kitap" } },
      { category: { contains: "Kitaplar" } },
      { category: { contains: "Kitap &" } },
      { category: { contains: "Kitaplık" } },
      { name: { contains: "Roman" } },
      { name: { contains: "Kitabı" } },
    ],
  };

  const bookTotal = await prisma.thyronixProduct.count({ where: bookWhere });
  const bookZero = await prisma.thyronixProduct.count({
    where: { ...bookWhere, stock: 0 },
  });
  const bookPositive = await prisma.thyronixProduct.count({
    where: { ...bookWhere, stock: { gt: 0 } },
  });

  const bookSamples = await prisma.thyronixProduct.findMany({
    where: bookWhere,
    take: 6,
    select: { externalId: true, name: true, stock: true, category: true },
    orderBy: { stock: "asc" },
  });

  const stockDist = await prisma.thyronixProduct.groupBy({
    by: ["stock"],
    where: { sourceId },
    _count: { _all: true },
    orderBy: { _count: { stock: "desc" } },
    take: 12,
  });

  console.log("\n=== Bezos stok özeti ===");
  console.log(JSON.stringify({ total, zeroStock, positiveStock, agg, bookTotal, bookZero, bookPositive }, null, 2));
  console.log("Stok dağılımı (en yaygın):", stockDist);
  console.log("Kitap örnekleri:", bookSamples);
}

async function main() {
  const bezosSources = await prisma.thyronixSource.findMany({
    where: {
      OR: [
        { inputFormat: "bezos" },
        { xmlUrl: { contains: "bezos.com.tr/xml-bayi" } },
        { name: { contains: "Bezos" } },
      ],
    },
  });

  if (bezosSources.length === 0) {
    console.error("Bezos kaynağı bulunamadı — temizlik iptal.");
    process.exit(1);
  }

  const keep =
    (BEZOS_SOURCE_ID && bezosSources.find((s) => s.id === BEZOS_SOURCE_ID)) ||
    bezosSources[0];

  console.log(`✓ Korunacak kaynak: ${keep.name} (${keep.id}) — ${keep.productCount} ürün`);

  const toDelete = await prisma.thyronixSource.findMany({
    where: { id: { not: keep.id } },
    select: { id: true, name: true, productCount: true },
  });

  if (toDelete.length === 0) {
    console.log("Silinecek kaynak yok.");
    await auditBezosStock(keep.id);
    return;
  }

  console.log(`\nSilinecek ${toDelete.length} kaynak:`);
  for (const s of toDelete) {
    console.log(`  - ${s.name} (${s.id}) — ${s.productCount} ürün`);
  }

  const deletedProducts = await prisma.thyronixProduct.deleteMany({
    where: { sourceId: { in: toDelete.map((s) => s.id) } },
  });
  const deletedSources = await prisma.thyronixSource.deleteMany({
    where: { id: { in: toDelete.map((s) => s.id) } },
  });

  console.log(`\n✓ ${deletedSources.count} kaynak silindi`);
  console.log(`✓ ${deletedProducts.count} ürün silindi`);

  const remaining = await prisma.thyronixSource.findMany({
    select: { id: true, name: true, productCount: true, xmlUrl: true },
  });
  console.log("\nKalan kaynaklar:", remaining);

  await auditBezosStock(keep.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
