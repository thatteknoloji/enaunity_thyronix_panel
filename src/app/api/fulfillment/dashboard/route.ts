import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardStats, getFulfillmentReport } from "@/lib/fulfillment/reports";
import { listWarehouseMovements } from "@/lib/fulfillment/warehouse";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "dashboard";
    if (type === "reports") {
      const period = (searchParams.get("period") || "monthly") as "daily" | "weekly" | "monthly";
      const report = await getFulfillmentReport(period);
      return NextResponse.json({ success: true, data: report });
    }
    if (type === "warehouse") {
      const movements = await listWarehouseMovements(undefined, 200);
      return NextResponse.json({ success: true, data: movements });
    }
    const stats = await getAdminDashboardStats();
    return NextResponse.json({ success: true, data: stats });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
