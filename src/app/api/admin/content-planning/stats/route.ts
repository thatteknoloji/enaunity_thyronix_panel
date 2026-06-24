import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPlanningDashboard } from "@/lib/content-planning/content-planning-service";

export async function GET() {
  try {
    await requireAdmin();
    const stats = await getPlanningDashboard();
    return NextResponse.json({ success: true, data: stats });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
