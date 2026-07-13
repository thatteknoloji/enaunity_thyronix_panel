import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createPricingVariant } from "@/lib/pricing-engine/pricing-service";
import type { PricingAdjustmentType } from "@/lib/pricing-engine/pricing-types";

export async function GET() {
  try {
    await requireAdmin();
    const { prisma } = await import("@/lib/db");
    const data = await prisma.pricingVariant.findMany({
      include: { rule: { select: { code: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = await createPricingVariant({
      ruleId: String(body.ruleId || ""),
      name: String(body.name || ""),
      code: String(body.code || ""),
      adjustmentType: String(body.adjustmentType || "FIXED") as PricingAdjustmentType,
      adjustmentValue: Number(body.adjustmentValue) || 0,
      isActive: body.isActive !== false,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Varyant oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
