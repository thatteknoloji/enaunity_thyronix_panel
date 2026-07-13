import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPublishingCalendar } from "@/lib/publishing-center/publishing-service";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") || 30);
    const calendar = await getPublishingCalendar(days);
    return NextResponse.json({ success: true, data: { calendar } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
