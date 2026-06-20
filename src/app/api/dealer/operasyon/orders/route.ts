import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { listOperasyonOrders, getOperasyonOrderDetail } from "@/lib/fulfillment/operasyon-service";

export async function GET(req: Request) {
  try {
    const dealer = await requireDealer();
    if (!dealer.dealerId) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (id) {
      const order = await getOperasyonOrderDetail(id, dealer.dealerId);
      if (!order) return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
      return NextResponse.json({ success: true, data: order });
    }
    const orders = await listOperasyonOrders({
      dealerId: dealer.dealerId,
      fulfillmentStatus: searchParams.get("fulfillmentStatus") || undefined,
      limit: 200,
    });
    return NextResponse.json({ success: true, data: orders });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
