import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getLinkSlashAnalytics } from "@/lib/linkslash/analytics";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getLinkSlashAnalytics();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analytics alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
