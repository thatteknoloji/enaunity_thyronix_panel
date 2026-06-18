import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

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

    const dealerIds = [...new Set(rows.map((r) => r.dealerId))];
    const packageIds = [...new Set(rows.map((r) => r.packageId))];

    const [dealers, packages] = await Promise.all([
      dealerIds.length
        ? prisma.dealer.findMany({
            where: { id: { in: dealerIds } },
            select: { id: true, name: true, company: true, email: true },
          })
        : [],
      packageIds.length
        ? prisma.productPackage.findMany({
            where: { id: { in: packageIds } },
            select: { id: true, name: true, slug: true },
          })
        : [],
    ]);

    const dealerMap = Object.fromEntries(dealers.map((d) => [d.id, d]));
    const packageMap = Object.fromEntries(packages.map((p) => [p.id, p]));

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        dealer: dealerMap[r.dealerId] || null,
        package: packageMap[r.packageId] || null,
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
    const { packageId, dealerId } = body as {
      packageId?: string;
      dealerId?: string;
    };
    if (!packageId || !dealerId) {
      return NextResponse.json({ success: false, error: "packageId ve dealerId zorunlu" }, { status: 400 });
    }

    const [pkg, dealer] = await Promise.all([
      prisma.productPackage.findUnique({ where: { id: packageId } }),
      prisma.dealer.findUnique({ where: { id: dealerId } }),
    ]);
    if (!pkg) return NextResponse.json({ success: false, error: "Paket bulunamadı" }, { status: 404 });
    if (!dealer) return NextResponse.json({ success: false, error: "Bayi bulunamadı" }, { status: 404 });

    const access = await prisma.productPackageAccess.upsert({
      where: { packageId_dealerId: { packageId, dealerId } },
      create: { packageId, dealerId, status: "ACTIVE", grantedBy: "admin" },
      update: { status: "ACTIVE", grantedAt: new Date(), grantedBy: "admin" },
    });

    return NextResponse.json({ success: true, data: access });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { packageId, dealerId } = body as { packageId?: string; dealerId?: string };
    if (!packageId || !dealerId) {
      return NextResponse.json({ success: false, error: "packageId ve dealerId zorunlu" }, { status: 400 });
    }

    await prisma.productPackageAccess.updateMany({
      where: { packageId, dealerId },
      data: { status: "REVOKED" },
    });

    return NextResponse.json({ success: true, data: { revoked: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
