/**
 * Thyronix ürünlerine kaynak bayi bilgisini yansıt (liste/filtre tutarlılığı).
 * Run: npx tsx scripts/repair-thyronix-product-scope.ts
 */
import { prisma } from "../src/lib/db";

async function main() {
  const sources = await prisma.thyronixSource.findMany({
    where: { dealerId: { not: null } },
    select: { id: true, dealerId: true, tenantScope: true },
  });

  let updated = 0;
  for (const source of sources) {
    const result = await prisma.thyronixProduct.updateMany({
      where: {
        sourceId: source.id,
        OR: [{ dealerId: null }, { tenantScope: "GLOBAL" }],
      },
      data: {
        dealerId: source.dealerId,
        tenantScope: source.tenantScope || "DEALER",
      },
    });
    updated += result.count;
  }

  const summary = {
    sources: sources.length,
    productsUpdated: updated,
    totalProducts: await prisma.thyronixProduct.count(),
  };
  console.log("OK", summary);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
