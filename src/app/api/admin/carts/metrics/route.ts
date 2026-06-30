import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/permission-guard";
import { getObservedCartMetrics } from "@/lib/cart/cart-observer-service";

export async function GET() {
  try {
    await requireAdminPermission("orders_view");
    const data = await getObservedCartMetrics();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Yetkisiz erişim" },
      { status: 401 },
    );
  }
}
