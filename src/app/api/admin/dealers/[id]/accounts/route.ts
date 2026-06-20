import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id: dealerId } = await params;

    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
    if (!dealer) return NextResponse.json({ success: false, error: "Bayi bulunamadı" }, { status: 404 });

    const users = await prisma.user.findMany({
      where: { dealerId },
      select: { id: true, email: true, name: true, role: true, status: true, phone: true, createdAt: true },
    });

    const subUsers = await prisma.subUser.findMany({
      where: { dealerId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const productLinks = await prisma.productAccountLink.findMany({
      where: { enaUser: { dealerId } },
      include: {
        externalUser: { select: { id: true, email: true, username: true, productType: true } },
        enaUser: { select: { id: true, email: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const licenses = await prisma.moduleLicense.findMany({
      where: { dealerId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { dealer, users, subUsers, productLinks, licenses },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
