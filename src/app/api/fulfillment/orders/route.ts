import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listOrders, createDealerOrder, getOrderDetail } from "@/lib/fulfillment/orders";
import { getAdminDashboardStats } from "@/lib/fulfillment/reports";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const fulfillmentStatus = searchParams.get("fulfillmentStatus") || undefined;
    const sourceType = searchParams.get("sourceType") || undefined;
    const id = searchParams.get("id");
    if (id) {
      const order = await getOrderDetail(id);
      if (!order) return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
      return NextResponse.json({ success: true, data: order });
    }
    const orders = await listOrders({ status, fulfillmentStatus, sourceType, limit: 200 });
    return NextResponse.json({ success: true, data: orders });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const order = await createDealerOrder(body);
    return NextResponse.json({ success: true, data: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sipariş oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
