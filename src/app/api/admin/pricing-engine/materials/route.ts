import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createPricingMaterial, listPricingMaterials } from "@/lib/pricing-engine/pricing-service";
import type { PricingMaterialUnit } from "@/lib/pricing-engine/pricing-types";

export async function GET() {
  try {
    await requireAdmin();
    const data = await listPricingMaterials();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = await createPricingMaterial({
      name: String(body.name || ""),
      code: String(body.code || ""),
      unit: String(body.unit || "M2") as PricingMaterialUnit,
      baseCost: Number(body.baseCost) || 0,
      currency: body.currency ? String(body.currency) : "TRY",
      isActive: body.isActive !== false,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Malzeme oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
