import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminHomepageConfig } from "@/lib/homepage/service";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getAdminHomepageConfig();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
