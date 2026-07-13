import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { seedDefaultPricingRules } from "@/lib/pricing-engine/pricing-service";

export async function POST() {
  try {
    await requireAdmin();
    const data = await seedDefaultPricingRules();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Seed başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
