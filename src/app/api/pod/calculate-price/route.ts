import { NextResponse } from "next/server";
import {
  calculatePricing,
  PRICING_UNAVAILABLE_MESSAGE,
} from "@/lib/pricing-engine/pricing-service";
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
      pricingCatalogId: body.pricingCatalogId ? String(body.pricingCatalogId) : undefined,
      sizeVariantKey: body.sizeVariantKey ? String(body.sizeVariantKey) : undefined,
      widthCm: Number(body.widthCm ?? 0),
      heightCm: Number(body.heightCm ?? 0),
      quantity: Math.max(1, Number(body.quantity ?? 1)),
      customerType: (body.customerType || "RETAIL") as PricingCustomerType,
      optionCodes: Array.isArray(body.optionCodes) ? body.optionCodes.map(String) : undefined,
    };

    const data = await calculatePricing(toCalculatePricingInput(bridgeReq));

    if (data.priceAvailable === false) {
      return NextResponse.json({
        success: false,
        error: PRICING_UNAVAILABLE_MESSAGE,
        code: "PRICE_NOT_DEFINED",
      });
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        calculationTimeMs: Date.now() - started,
        templateId: bridgeReq.templateId,
        variantId: bridgeReq.variantId,
        catalogId: bridgeReq.pricingCatalogId,
        sizeVariantKey: bridgeReq.sizeVariantKey,
      },
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: "Fiyat şu an hesaplanamıyor. Lütfen ölçü ve ürün seçimini kontrol edin.",
      code: "PRICE_CALC_ERROR",
    });
  }
}
