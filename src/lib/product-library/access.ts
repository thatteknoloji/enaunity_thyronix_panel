import { prisma } from "@/lib/db";
import { canAccessPackageLevel, getDealerLibraryTier } from "./license";
import { dealerCanDownloadPackage, getDealerPackageStates } from "./package-access-service";
import type { DistributionFormat, LicenseLevel } from "./types";
import { refreshPackageProductCount } from "./catalog-stats";

export async function getAccessiblePackages(dealerId: string) {
  const states = await getDealerPackageStates(dealerId);
  return states.filter((p) => p.dealerState === "ACCESSIBLE");
}

export async function dealerCanAccessPackage(dealerId: string, packageId: string) {
  return dealerCanDownloadPackage(dealerId, packageId);
}

export async function logDistribution(params: {
  packageId: string;
  dealerId: string;
  format: DistributionFormat;
  recipeId?: string;
  recipeName?: string;
  storeName?: string;
  fileName?: string;
  itemCount?: number;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.productDistributionLog.create({
    data: {
      packageId: params.packageId,
      dealerId: params.dealerId,
      format: params.format,
      recipeId: params.recipeId || "",
      recipeName: params.recipeName || "",
      storeName: params.storeName || "",
      fileName: params.fileName || "",
      itemCount: params.itemCount || 0,
      userId: params.userId || "",
      userEmail: params.userEmail || "",
      ipAddress: params.ipAddress || "",
      userAgent: params.userAgent || "",
    },
  });
}

export async function getCatalogCardsForDealer(dealerId: string) {
  const packages = await getAccessiblePackages(dealerId);
  const catalogIdSet = new Set<string>();
  for (const pkg of packages) {
    try {
      const ids: string[] = JSON.parse(pkg.catalogIds || "[]");
      ids.forEach((id) => catalogIdSet.add(id));
    } catch {}
  }
  if (catalogIdSet.size === 0) return [];

  const catalogs = await prisma.productCatalog.findMany({
    where: { id: { in: [...catalogIdSet] }, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  const tier = await getDealerLibraryTier(dealerId);
  const result = [];
  for (const cat of catalogs) {
    const brandCount = await prisma.productCatalogItem.groupBy({
      by: ["brand"],
      where: { catalogId: cat.id, status: "ACTIVE", brand: { not: "" } },
    });
    const pkgForCat = packages.find((p) => {
      try {
        const ids: string[] = JSON.parse(p.catalogIds || "[]");
        return ids.includes(cat.id);
      } catch {
        return false;
      }
    });
    result.push({
      ...cat,
      brandCount: brandCount.length,
      licenseLevel: pkgForCat?.licenseLevel || "FREE",
      packageId: pkgForCat?.id,
      packageName: pkgForCat?.name,
    });
  }
  return result;
}

export async function ensureUniqueSlug(base: string, model: "catalog" | "package" | "supplier", excludeId?: string) {
  let slug = base;
  let i = 1;
  while (true) {
    const exists =
      model === "catalog"
        ? await prisma.productCatalog.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) } })
        : model === "package"
          ? await prisma.productPackage.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) } })
          : await prisma.productSupplier.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) } });
    if (!exists) return slug;
    slug = `${base}-${i++}`;
  }
}

export async function syncPackageCounts(packageId: string) {
  return refreshPackageProductCount(packageId);
}
