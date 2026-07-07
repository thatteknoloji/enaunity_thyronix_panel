import { NextResponse } from "next/server";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import {
  previewAllRulesImpact,
  resolveRulesDealerId,
} from "@/lib/thyronix/rules/profile-service";
import type { ThyronixGateRules, ThyronixPriceRules, ThyronixStockRules } from "@/lib/thyronix/rules/types";

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const dealerId = await resolveRulesDealerId(user, body.dealerId);
    const data = await previewAllRulesImpact(
      dealerId,
      {
        price: body.price as ThyronixPriceRules | undefined,
        stock: body.stock as ThyronixStockRules | undefined,
        gate: body.gate as ThyronixGateRules | undefined,
      },
      body.sourceId || null,
    );
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
