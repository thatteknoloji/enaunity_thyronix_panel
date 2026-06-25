import { NextResponse } from "next/server";
import { calculatePricing } from "@/lib/pricing-engine/pricing-service";
import { toCalculatePricingInput, type PodPricingBridgeRequest } from "@/lib/pod-core/pod-pricing-bridge";
import type { PricingCustomerType } from "@/lib/pricing-engine/pricing-types";

export async function POST(req: Request) {
  const started = Date.now();
  try {
    const body = (await req.json()) as Partial<PodPricingBridgeRequest>;
    const pricingRuleCode = String(body.pricingRuleCode || "");
    if (!pricingRuleCode) {
      return NextResponse.json({ success: false, error: "pricingRuleCode zorunlu" }, { status: 400 });
    }

    const bridgeReq: PodPricingBridgeRequest = {
      templateId: String(body.templateId || ""),
      variantId: body.variantId ? String(body.variantId) : undefined,
      pricingRuleCode,
      widthCm: Number(body.widthCm ?? 0),
      heightCm: Number(body.heightCm ?? 0),
      quantity: Math.max(1, Number(body.quantity ?? 1)),
      customerType: (body.customerType || "RETAIL") as PricingCustomerType,
    };

    const data = await calculatePricing(toCalculatePricingInput(bridgeReq));

    return NextResponse.json({
      success: true,
      data,
      meta: {
        calculationTimeMs: Date.now() - started,
        templateId: bridgeReq.templateId,
        variantId: bridgeReq.variantId,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fiyat hesaplanamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
