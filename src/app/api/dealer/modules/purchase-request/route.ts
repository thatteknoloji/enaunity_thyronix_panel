import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canDealerPurchaseModule } from "@/lib/modules/access";
import { createPaymentIntent } from "@/lib/payments/payment-service";

export async function POST(req: Request) {
  try {
    // Extract dealerId from JWT cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Geçersiz oturum" }, { status: 401 });

    const dealerId = payload.dealerId;
    if (!dealerId) return NextResponse.json({ error: "Bayi hesabı bulunamadı" }, { status: 403 });

    const body = await req.json();
    const { moduleKey, planKey } = body;
    if (!moduleKey || !planKey) return NextResponse.json({ error: "moduleKey ve planKey zorunlu" }, { status: 400 });

    const canPurchase = await canDealerPurchaseModule(dealerId);
    if (!canPurchase) return NextResponse.json({ error: "Bayi onayınız tamamlanmadan modül satın alamazsınız" }, { status: 403 });

    const plan = await prisma.modulePlan.findFirst({ where: { moduleKey, planKey, isActive: true } });
    if (!plan) return NextResponse.json({ error: "Geçersiz paket" }, { status: 400 });

    const existing = await prisma.moduleLicense.findFirst({
      where: { dealerId, moduleKey, status: { in: ["ACTIVE", "TRIAL"] } },
    });
    if (existing) return NextResponse.json({ error: "Bu modül için zaten aktif bir lisansınız var" }, { status: 400 });

    const result = await createPaymentIntent({
      dealerId, moduleKey, planKey,
      amount: plan.monthlyPrice,
      currency: plan.currency || "TRY",
      paymentType: "MANUAL",
    });

    return NextResponse.json({ success: result.success, data: { paymentId: result.paymentId, status: result.status, message: result.message, moduleKey, planKey } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}
