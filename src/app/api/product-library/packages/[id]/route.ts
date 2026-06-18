import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { syncPackageCounts } from "@/lib/product-library/access";
import { getPackageItems } from "@/lib/product-library/items";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const pkg = await prisma.productPackage.findUnique({ where: { id } });
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Paket bulunamadı" }, { status: 404 });
    }

    let catalogIds: string[] = [];
    try {
      catalogIds = JSON.parse(pkg.catalogIds || "[]");
    } catch {
      catalogIds = [];
    }

    const [catalogs, items, accessCount, downloadCount] = await Promise.all([
      catalogIds.length
        ? prisma.productCatalog.findMany({ where: { id: { in: catalogIds } } })
        : [],
      getPackageItems(id),
      prisma.productPackageAccess.count({ where: { packageId: id, status: "ACTIVE" } }),
      prisma.productDistributionLog.count({ where: { packageId: id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        package: pkg,
        catalogs,
        previewItems: items.slice(0, 20),
        productCount: items.length,
        accessCount,
        downloadCount,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    const fields = [
      "name", "description", "catalogIds", "licenseLevel", "monthlyPrice", "yearlyPrice",
      "oneTimePrice", "billingType", "badgeText", "isFeatured", "isNew", "isBestSeller",
      "publishedAt", "isFree", "thyronixReady", "status",
    ] as const;

    for (const field of fields) {
      if (body[field] !== undefined) {
        if (field === "catalogIds") data.catalogIds = JSON.stringify(body.catalogIds || []);
        else if (field === "publishedAt") data.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
        else data[field] = body[field];
      }
    }

    const pkg = await prisma.productPackage.update({ where: { id }, data });
    await syncPackageCounts(id);
    const updated = await prisma.productPackage.findUnique({ where: { id } });
    return NextResponse.json({ success: true, data: updated || pkg });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
