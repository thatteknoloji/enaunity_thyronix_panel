import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getGeoJobStats } from "@/lib/geo-content-factory/geo-content-factory-service";

export async function GET() {
  try {
    await requireAdmin();
    const stats = await getGeoJobStats();
    return NextResponse.json({ success: true, data: stats });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
