import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canDealerPurchaseModule } from "@/lib/modules/access";
import { createPaymentIntent } from "@/lib/payments/payment-service";
import { assertPaymentMethodAllowed } from "@/lib/payments/payment-method-policy";
import { notifyBankTransferCreated } from "@/lib/payments/payment-deadline-worker";
import {
  resolveProviderKey,
  type ProductLibraryPaymentMethod,
} from "@/lib/payments/gateway-config";
import { calculatePaymentTotal, getPaymentSettings } from "@/lib/payments/payment-settings";

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
    const { moduleKey, planKey, paymentMethod = "BANK_TRANSFER", installmentCount = 1 } = body;
    if (!moduleKey || !planKey) {
      return NextResponse.json({ error: "moduleKey ve planKey zorunlu" }, { status: 400 });
    }

    const method = paymentMethod as ProductLibraryPaymentMethod;
    const allowed = await assertPaymentMethodAllowed(dealerId, method);
    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.error, alternatives: allowed.alternatives }, { status: 400 });
    }

    const canPurchase = await canDealerPurchaseModule(dealerId);
    if (!canPurchase) {
      return NextResponse.json({ error: "Bayi onayınız tamamlanmadan modül satın alamazsınız" }, { status: 403 });
    }

    const plan = await prisma.modulePlan.findFirst({ where: { moduleKey, planKey, isActive: true } });
    if (!plan) return NextResponse.json({ error: "Geçersiz paket" }, { status: 400 });

    const existing = await prisma.moduleLicense.findFirst({
      where: { dealerId, moduleKey, status: { in: ["ACTIVE", "TRIAL"] } },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu modül için zaten aktif bir lisansınız var" }, { status: 400 });
    }

    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
    let amount = plan.monthlyPrice;
    const providerKey = resolveProviderKey(method);

    if (method === "ESNEKPOS" || method === "IYZICO") {
      const settings = await getPaymentSettings();
      amount = calculatePaymentTotal(amount, method, settings).totalAmount;
    }

    const result = await createPaymentIntent({
      dealerId,
      moduleKey,
      planKey,
      amount,
      currency: plan.currency || "TRY",
      paymentType: method === "BANK_TRANSFER" ? "MANUAL" : "CARD",
      providerKey,
      metadata: {
        buyer: {
          id: dealerId,
          name: dealer?.name || dealer?.company || "Bayi",
          email: dealer?.email || "",
          phone: dealer?.phone || "5550000000",
        },
        installmentCount,
      },
    });

    if (method === "BANK_TRANSFER" && result.success) {
      await notifyBankTransferCreated({
        dealerId,
        title: "Havale/EFT — dekont yükleyin",
        message: `${moduleKey} modül ödemeniz için dekont yüklemeniz zorunludur. 24 saat içinde yüklenmezse işlem iptal edilir.`,
        link: `/payment/pending?module=${moduleKey}&plan=${planKey}&paymentId=${result.paymentId}`,
      });
    }

    return NextResponse.json({
      success: result.success,
      data: {
        paymentId: result.paymentId,
        status: result.status,
        message: result.message,
        moduleKey,
        planKey,
        paymentMethod: method,
        redirectUrl: result.redirectUrl || null,
        requiresReceipt: method === "BANK_TRANSFER",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
