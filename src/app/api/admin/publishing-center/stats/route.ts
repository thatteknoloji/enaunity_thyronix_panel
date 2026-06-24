import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPublishingStats } from "@/lib/publishing-center/publishing-service";

export async function GET() {
  try {
    await requireAdmin();
    const stats = await getPublishingStats();
    return NextResponse.json({ success: true, data: stats });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
