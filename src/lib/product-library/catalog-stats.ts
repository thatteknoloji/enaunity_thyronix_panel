import { prisma } from "@/lib/db";

export async function refreshCatalogStats(catalogId: string) {
  const [productCount, supplierCount] = await Promise.all([
    prisma.productCatalogItem.count({ where: { catalogId, status: "ACTIVE" } }),
    prisma.productSupplier.count({ where: { catalogId } }),
  ]);
  await prisma.productCatalog.update({
    where: { id: catalogId },
    data: { productCount, supplierCount },
  });
  return { productCount, supplierCount };
}

export async function refreshPackageProductCount(packageId: string) {
  const pkg = await prisma.productPackage.findUnique({ where: { id: packageId } });
  if (!pkg) return 0;
  let ids: string[] = [];
  try {
    ids = JSON.parse(pkg.catalogIds || "[]");
  } catch {
    ids = [];
  }
  if (ids.length === 0) {
    await prisma.productPackage.update({ where: { id: packageId }, data: { productCount: 0 } });
    return 0;
  }
  const count = await prisma.productCatalogItem.count({
    where: { catalogId: { in: ids }, status: "ACTIVE" },
  });
  await prisma.productPackage.update({ where: { id: packageId }, data: { productCount: count } });
  return count;
}
