import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { processModulePurchase } from "@/lib/payments/module-checkout-payment-service";
import type { PaymentMode } from "@/lib/payments/checkout-payment-service";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Geçersiz oturum" }, { status: 401 });

    const dealerId = payload.dealerId;
    if (!dealerId) return NextResponse.json({ error: "Bayi hesabı bulunamadı" }, { status: 403 });

    const body = await req.json();
    const { moduleKey, planKey, paymentMethod = "BANK_TRANSFER", paymentMode, installmentCount = 1 } = body;
    if (!moduleKey || !planKey) {
      return NextResponse.json({ error: "moduleKey ve planKey zorunlu" }, { status: 400 });
    }

    const result = await processModulePurchase({
      dealerId,
      moduleKey,
      planKey,
      paymentMethod,
      paymentMode: paymentMode as PaymentMode | undefined,
      installmentCount,
    });

    return NextResponse.json({ success: result.success, data: result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
