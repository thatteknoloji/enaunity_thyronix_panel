import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizeDealerAdminInput } from "@/lib/admin/dealer-admin-input";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const dealer = await prisma.dealer.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true } },
        orders: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: { id: true, total: true, status: true, createdAt: true, hasBackorder: true },
        },
      },
    });
    if (!dealer) return NextResponse.json({ success: false, error: "Bayi bulunamadı" }, { status: 404 });
    const { orders: latestOrders, ...rest } = dealer;
    return NextResponse.json({ success: true, data: { ...rest, latestOrders } });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = normalizeDealerAdminInput(body) as Prisma.DealerUpdateInput;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "Güncellenecek alan yok" }, { status: 400 });
    }

    const dealer = await prisma.dealer.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: dealer });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const orderCount = await prisma.order.count({ where: { dealerId: id } });
    if (orderCount > 0) {
      return NextResponse.json(
        { success: false, error: `Bu bayinin ${orderCount} siparişi var. Önce askıya alın veya siparişleri taşıyın.` },
        { status: 409 }
      );
    }

    await prisma.user.updateMany({ where: { dealerId: id }, data: { dealerId: null } });
    await prisma.dealer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    return NextResponse.json({ success: false, error: msg.includes("Foreign") ? "Bayi silinemedi — bağlı kayıtlar var" : msg }, { status: 500 });
  }
}
