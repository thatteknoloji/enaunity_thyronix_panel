import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { archivePricingRule } from "@/lib/pricing-engine/pricing-service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = await archivePricingRule(id);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Arşivlenemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
