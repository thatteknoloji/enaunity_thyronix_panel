import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPricingDashboard } from "@/lib/pricing-engine/pricing-service";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getPricingDashboard();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 401 });
  }
}
