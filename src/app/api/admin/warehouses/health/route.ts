import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getWarehouseHealthIssues } from "@/lib/warehouse/warehouse-service";

export async function GET() {
  try {
    await requireAdmin();
    const issues = await getWarehouseHealthIssues();
    return NextResponse.json({
      success: true,
      data: { issues, healthy: issues.length === 0, count: issues.length },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
