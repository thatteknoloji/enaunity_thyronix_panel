import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { listOrders, getOrderDetail } from "@/lib/fulfillment/orders";

export async function GET(req: Request) {
  try {
    const user = await requireDealer();
    const dealerId = user.dealerId!;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (id) {
      const order = await getOrderDetail(id, dealerId);
      if (!order) return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
      return NextResponse.json({ success: true, data: order });
    }
    const status = searchParams.get("status") || undefined;
    const fulfillmentStatus = searchParams.get("fulfillmentStatus") || undefined;
    const sourceType = searchParams.get("sourceType") || undefined;
    const orders = await listOrders({ dealerId, status, fulfillmentStatus, sourceType, limit: 100 });
    return NextResponse.json({ success: true, data: orders });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
