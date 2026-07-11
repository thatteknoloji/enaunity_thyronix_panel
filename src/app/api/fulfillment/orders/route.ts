import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listOperasyonOrders, getOperasyonOrderDetail } from "@/lib/fulfillment/operasyon-service";
import { createDealerOrder } from "@/lib/fulfillment/orders";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (id) {
      const order = await getOperasyonOrderDetail(id);
      if (!order) return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
      return NextResponse.json({ success: true, data: order });
    }
    const orders = await listOperasyonOrders({
      fulfillmentStatus: searchParams.get("fulfillmentStatus") || undefined,
      limit: 200,
    });
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
