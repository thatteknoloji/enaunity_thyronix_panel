import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

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

    const dealer = await prisma.dealer.update({ where: { id }, data: body });
    return NextResponse.json({ success: true, data: dealer });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.dealer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
