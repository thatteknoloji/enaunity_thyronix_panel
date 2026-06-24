import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/modules/access";

export async function GET(req: NextRequest) {
  try {
    const user = await requireDealer();
    const has = await hasModuleAccess(user.dealerId!, "AI_DROPSHIP", { userRole: user.role });
    if (!has) throw new Error("Bu modüle erişim yetkiniz yok");
    const dealerId = user.dealerId!;
    const { searchParams } = new URL(req.url);

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, data: [] });
    }

    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "100", 10) || 100));
    const statusFilter = searchParams.get("status") || "";

    const orders = await prisma.storeOrder.findMany({
      where: { storeId: store.id, ...(statusFilter ? { status: statusFilter } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
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
    const has = await hasModuleAccess(user.dealerId!, "AI_DROPSHIP", { userRole: user.role });
    if (!has) throw new Error("Bu modüle erişim yetkiniz yok");
    const dealerId = user.dealerId!;
    const body = await req.json();

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }

    const { id, status, trackingCode, carrierName } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "id gerekli" }, { status: 400 });
    }

    const order = await prisma.storeOrder.findFirst({ where: { id, storeId: store.id } });
    if (!order) {
      return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (status) {
      const validStatuses = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ success: false, error: "Geçersiz durum" }, { status: 400 });
      }
      data.status = status;
    }
    if (trackingCode !== undefined) data.trackingCode = trackingCode;
    if (carrierName !== undefined) data.carrierName = carrierName;

    const updated = await prisma.storeOrder.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
