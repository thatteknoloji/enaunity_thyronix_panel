import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createPricingRule, listPricingRules } from "@/lib/pricing-engine/pricing-service";
import type { PricingFormulaType, PricingProductType, PricingRoundingMode } from "@/lib/pricing-engine/pricing-types";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const status = new URL(req.url).searchParams.get("status") || undefined;
    const data = await listPricingRules(status || undefined);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = await createPricingRule({
      name: String(body.name || ""),
      code: String(body.code || ""),
      productType: String(body.productType || "CUSTOM") as PricingProductType,
      materialId: body.materialId ? String(body.materialId) : null,
      formulaType: String(body.formulaType || "FIXED") as PricingFormulaType,
      basePrice: Number(body.basePrice) || 0,
      minPrice: Number(body.minPrice) || 0,
      wastePercent: Number(body.wastePercent) || 0,
      laborCost: Number(body.laborCost) || 0,
      printCost: Number(body.printCost) || 0,
      cuttingCost: Number(body.cuttingCost) || 0,
      packagingCost: Number(body.packagingCost) || 0,
      shippingCost: Number(body.shippingCost) || 0,
      commissionPercent: Number(body.commissionPercent) || 0,
      profitPercent: Number(body.profitPercent) || 0,
      dealerDiscountPercent: Number(body.dealerDiscountPercent) || 0,
      taxPercent: body.taxPercent !== undefined ? Number(body.taxPercent) : 20,
      roundingMode: (body.roundingMode || "NONE") as PricingRoundingMode,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kural oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
