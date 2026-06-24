import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const orders = await prisma.storeOrder.findMany({
      where: { storeId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ success: true, data: orders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ success: false, error: "orderId ve status gerekli" }, { status: 400 });
    }

    const validStatuses = ["CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: "Geçersiz durum" }, { status: 400 });
    }

    const order = await prisma.storeOrder.findFirst({ where: { id: orderId, storeId: id } });
    if (!order) return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });

    const updated = await prisma.storeOrder.update({ where: { id: orderId }, data: { status } });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
