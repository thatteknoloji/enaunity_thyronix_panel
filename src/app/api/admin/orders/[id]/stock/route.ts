import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getOrderStockStatus } from "@/lib/orders/order-stock-service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const status = await getOrderStockStatus(id);
    if (!status) {
      return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: status });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
