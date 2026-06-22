import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminHomepageConfig } from "@/lib/homepage/service";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getAdminHomepageConfig();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yetkisiz";
    const status = msg === "Forbidden" || msg === "Unauthorized" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
