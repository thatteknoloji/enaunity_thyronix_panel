import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updatePricingMaterial } from "@/lib/pricing-engine/pricing-service";
import type { PricingMaterialUnit } from "@/lib/pricing-engine/pricing-types";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = await updatePricingMaterial(id, {
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.code !== undefined ? { code: String(body.code) } : {}),
      ...(body.unit !== undefined ? { unit: String(body.unit) as PricingMaterialUnit } : {}),
      ...(body.baseCost !== undefined ? { baseCost: Number(body.baseCost) } : {}),
      ...(body.currency !== undefined ? { currency: String(body.currency) } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Güncellenemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
