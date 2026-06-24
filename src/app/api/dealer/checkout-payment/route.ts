import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { buildCheckoutPaymentContext } from "@/lib/payments/checkout-payment-service";
import { resolveDealerPaymentMethods } from "@/lib/payments/payment-method-policy";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.dealerId) {
      return NextResponse.json({ success: false, error: "Yalnızca bayiler" }, { status: 403 });
    }

    const cartTotal = parseFloat(new URL(req.url).searchParams.get("cartTotal") || "0");
    if (!cartTotal || cartTotal <= 0) {
      return NextResponse.json({ success: false, error: "cartTotal gerekli" }, { status: 400 });
    }

    const resolved = await resolveDealerPaymentMethods(user.dealerId);
    const ctx = await buildCheckoutPaymentContext({
      dealerId: user.dealerId,
      cartTotal,
      balanceEnabled: resolved.balanceEnabled,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...ctx,
        cardMethods: resolved.methods.filter((m) => m === "ESNEKPOS" || m === "IYZICO"),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ödeme özeti alınamadı";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
