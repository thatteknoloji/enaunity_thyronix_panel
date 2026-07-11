import { prisma } from "@/lib/db";
import type { CatalogItemInput } from "./types";
import { refreshCatalogStats } from "./catalog-stats";

export async function bulkInsertCatalogItems(
  catalogId: string,
  supplierId: string | null,
  items: CatalogItemInput[]
) {
  let created = 0;
  for (const item of items) {
    await prisma.productCatalogItem.create({
      data: {
        catalogId,
        supplierId,
        barcode: item.barcode || "",
        sku: item.sku || "",
        name: item.name,
        brand: item.brand || "",
        category: item.category || "",
        price: item.price ?? 0,
        salePrice: item.salePrice ?? item.price ?? 0,
        stock: item.stock ?? 0,
        vatRate: item.vatRate ?? 20,
        imagesJson: item.imagesJson || "[]",
        attributesJson: item.attributesJson || "{}",
        status: "ACTIVE",
      },
    });
    created++;
  }
  await refreshCatalogStats(catalogId);
  return created;
}

export async function getPackageItems(packageId: string) {
  const pkg = await prisma.productPackage.findUnique({ where: { id: packageId } });
  if (!pkg) return [];
  let catalogIds: string[] = [];
  try {
    catalogIds = JSON.parse(pkg.catalogIds || "[]");
  } catch {
    catalogIds = [];
  }
  if (catalogIds.length === 0) return [];
  return prisma.productCatalogItem.findMany({
    where: { catalogId: { in: catalogIds }, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}
