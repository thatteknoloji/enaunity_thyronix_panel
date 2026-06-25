import { NextResponse } from "next/server";
import { calculatePricing } from "@/lib/pricing-engine/pricing-service";
import type { PricingCustomerType } from "@/lib/pricing-engine/pricing-types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ruleCode = String(body.ruleCode || "");
    if (!ruleCode) {
      return NextResponse.json({ success: false, error: "ruleCode zorunlu" }, { status: 400 });
    }

    const data = await calculatePricing({
      ruleCode,
      widthCm: body.widthCm !== undefined ? Number(body.widthCm) : undefined,
      heightCm: body.heightCm !== undefined ? Number(body.heightCm) : undefined,
      lengthMeter: body.lengthMeter !== undefined ? Number(body.lengthMeter) : undefined,
      quantity: body.quantity !== undefined ? Number(body.quantity) : undefined,
      variantCodes: Array.isArray(body.variantCodes) ? body.variantCodes.map(String) : [],
      optionCodes: Array.isArray(body.optionCodes) ? body.optionCodes.map(String) : [],
      customerType: (body.customerType || "RETAIL") as PricingCustomerType,
      sourceType: body.sourceType ? String(body.sourceType) : "PUBLIC_API",
      writeLog: body.writeLog !== false,
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hesaplama başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
