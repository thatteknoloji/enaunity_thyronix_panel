import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getBlogDashboardStats } from "@/lib/blog-engine/blog-service";

export async function GET() {
  try {
    await requireAdmin();
    const stats = await getBlogDashboardStats();
    return NextResponse.json({ success: true, data: stats });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
