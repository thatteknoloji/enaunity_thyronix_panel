import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const [catalogCount, productCount, supplierCount, packageCount, topCatalogs, recentImports, recentDistributions] =
      await Promise.all([
        prisma.productCatalog.count(),
        prisma.productCatalogItem.count({ where: { status: "ACTIVE" } }),
        prisma.productSupplier.count(),
        prisma.productPackage.count(),
        prisma.productCatalog.findMany({ orderBy: { productCount: "desc" }, take: 5 }),
        prisma.productImportJob.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
        prisma.productDistributionLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { package: { select: { name: true } } },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        catalogCount,
        productCount,
        supplierCount,
        packageCount,
        topCatalogs,
        recentImports,
        recentDistributions,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
