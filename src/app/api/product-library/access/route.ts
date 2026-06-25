import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

async function loadPackageOrFail(packageId: string) {
  const pkg = await prisma.productPackage.findUnique({ where: { id: packageId } });
  if (!pkg) {
    throw new Error("Paket bulunamadı");
  }
  return pkg;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const packageId = url.searchParams.get("packageId") || undefined;
    const dealerId = url.searchParams.get("dealerId") || undefined;

    const where: Record<string, unknown> = {};
    if (packageId) where.packageId = packageId;
    if (dealerId) where.dealerId = dealerId;

    const rows = await prisma.productPackageAccess.findMany({
      where,
      orderBy: { grantedAt: "desc" },
      take: 500,
    });

    const dealerIds = [...new Set(rows.map((row) => row.dealerId))];
    const packageIds = [...new Set(rows.map((row) => row.packageId))];

    const [dealers, packages] = await Promise.all([
      dealerIds.length
        ? prisma.dealer.findMany({
            where: { id: { in: dealerIds } },
            select: { id: true, name: true, company: true, email: true, group: true },
          })
        : [],
      packageIds.length
        ? prisma.productPackage.findMany({
            where: { id: { in: packageIds } },
            select: { id: true, name: true, slug: true },
          })
        : [],
    ]);

    const dealerMap = Object.fromEntries(dealers.map((dealer) => [dealer.id, dealer]));
    const packageMap = Object.fromEntries(packages.map((pkg) => [pkg.id, pkg]));

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        dealer: dealerMap[row.dealerId] || null,
        package: packageMap[row.packageId] || null,
      })),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { packageId, dealerId, dealerGroup } = body as {
      packageId?: string;
      dealerId?: string;
      dealerGroup?: string;
    };

    if (!packageId || (!dealerId && !dealerGroup)) {
      return NextResponse.json({ success: false, error: "packageId ve bayi veya bayi grubu zorunlu" }, { status: 400 });
    }

    const pkg = await loadPackageOrFail(packageId);

    if (dealerGroup) {
      const dealers = await prisma.dealer.findMany({
        where: { group: dealerGroup },
        select: { id: true },
      });
      if (!dealers.length) {
        return NextResponse.json({ success: false, error: "Bu grupta bayi bulunamadı" }, { status: 404 });
      }

      await Promise.all(
        dealers.map((dealer) =>
          prisma.productPackageAccess.upsert({
            where: { packageId_dealerId: { packageId, dealerId: dealer.id } },
            create: {
              packageId,
              dealerId: dealer.id,
              status: "ACTIVE",
              grantedBy: `admin-group:${dealerGroup}`,
            },
            update: {
              status: "ACTIVE",
              grantedAt: new Date(),
              grantedBy: `admin-group:${dealerGroup}`,
            },
          }),
        ),
      );

      return NextResponse.json({
        success: true,
        data: {
          scope: "GROUP",
          dealerGroup,
          package: { id: pkg.id, name: pkg.name, slug: pkg.slug },
          grantedCount: dealers.length,
        },
      });
    }

    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId! } });
    if (!dealer) {
      return NextResponse.json({ success: false, error: "Bayi bulunamadı" }, { status: 404 });
    }

    const access = await prisma.productPackageAccess.upsert({
      where: { packageId_dealerId: { packageId, dealerId: dealerId! } },
      create: { packageId, dealerId: dealerId!, status: "ACTIVE", grantedBy: "admin" },
      update: { status: "ACTIVE", grantedAt: new Date(), grantedBy: "admin" },
    });

    return NextResponse.json({ success: true, data: access });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    const status = msg === "Paket bulunamadı" ? 404 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { packageId, dealerId, dealerGroup } = body as {
      packageId?: string;
      dealerId?: string;
      dealerGroup?: string;
    };

    if (!packageId || (!dealerId && !dealerGroup)) {
      return NextResponse.json({ success: false, error: "packageId ve bayi veya bayi grubu zorunlu" }, { status: 400 });
    }

    if (dealerGroup) {
      const dealers = await prisma.dealer.findMany({
        where: { group: dealerGroup },
        select: { id: true },
      });
      if (!dealers.length) {
        return NextResponse.json({ success: false, error: "Bu grupta bayi bulunamadı" }, { status: 404 });
      }

      const result = await prisma.productPackageAccess.updateMany({
        where: {
          packageId,
          dealerId: { in: dealers.map((dealer) => dealer.id) },
        },
        data: {
          status: "REVOKED",
          grantedBy: `revoked-group:${dealerGroup}`,
        },
      });

      return NextResponse.json({
        success: true,
        data: { revoked: true, scope: "GROUP", dealerGroup, count: result.count },
      });
    }

    await prisma.productPackageAccess.updateMany({
      where: { packageId, dealerId: dealerId! },
      data: { status: "REVOKED" },
    });

    return NextResponse.json({ success: true, data: { revoked: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
