import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireDealer();
    const dealerId = user.dealerId!;

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, data: [] });
    }

    const orders = await prisma.storeOrder.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireDealer();
    const dealerId = user.dealerId!;
    const body = await req.json();

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }

    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ success: false, error: "id ve status gerekli" }, { status: 400 });
    }

    const validStatuses = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: "Geçersiz durum" }, { status: 400 });
    }

    const order = await prisma.storeOrder.findFirst({ where: { id, storeId: store.id } });
    if (!order) {
      return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    }

    const updated = await prisma.storeOrder.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
