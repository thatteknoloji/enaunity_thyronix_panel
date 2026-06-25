import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPricingRule, updatePricingRule } from "@/lib/pricing-engine/pricing-service";
import type { PricingFormulaType, PricingProductType, PricingRoundingMode } from "@/lib/pricing-engine/pricing-types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = await getPricingRule(id);
    if (!data) return NextResponse.json({ success: false, error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = await updatePricingRule(id, {
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.code !== undefined ? { code: String(body.code) } : {}),
      ...(body.productType !== undefined ? { productType: String(body.productType) as PricingProductType } : {}),
      ...(body.materialId !== undefined ? { materialId: body.materialId ? String(body.materialId) : null } : {}),
      ...(body.formulaType !== undefined ? { formulaType: String(body.formulaType) as PricingFormulaType } : {}),
      ...(body.basePrice !== undefined ? { basePrice: Number(body.basePrice) } : {}),
      ...(body.minPrice !== undefined ? { minPrice: Number(body.minPrice) } : {}),
      ...(body.wastePercent !== undefined ? { wastePercent: Number(body.wastePercent) } : {}),
      ...(body.laborCost !== undefined ? { laborCost: Number(body.laborCost) } : {}),
      ...(body.printCost !== undefined ? { printCost: Number(body.printCost) } : {}),
      ...(body.cuttingCost !== undefined ? { cuttingCost: Number(body.cuttingCost) } : {}),
      ...(body.packagingCost !== undefined ? { packagingCost: Number(body.packagingCost) } : {}),
      ...(body.shippingCost !== undefined ? { shippingCost: Number(body.shippingCost) } : {}),
      ...(body.commissionPercent !== undefined ? { commissionPercent: Number(body.commissionPercent) } : {}),
      ...(body.profitPercent !== undefined ? { profitPercent: Number(body.profitPercent) } : {}),
      ...(body.dealerDiscountPercent !== undefined ? { dealerDiscountPercent: Number(body.dealerDiscountPercent) } : {}),
      ...(body.taxPercent !== undefined ? { taxPercent: Number(body.taxPercent) } : {}),
      ...(body.roundingMode !== undefined ? { roundingMode: String(body.roundingMode) as PricingRoundingMode } : {}),
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Güncellenemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
