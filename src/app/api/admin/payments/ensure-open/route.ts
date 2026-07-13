import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ensureAllPaymentsOpen } from "@/lib/payments/payment-method-policy";
import { getPaymentSettings, savePaymentSettings } from "@/lib/payments/payment-settings";
import { updateBalanceTopUpSettings } from "@/lib/payments/balance-topup-settings";

export async function POST() {
  try {
    const admin = await requireAdmin();
    const policyResult = await ensureAllPaymentsOpen(admin.email || admin.name);

    const current = await getPaymentSettings();
    const gatewayPatch: Record<string, unknown> = {
      bankTransferEnabled: true,
    };

    if (current.esnekpos.configured || current.esnekpos.enabled) {
      gatewayPatch.esnekposEnabled = true;
      if (current.activeCardProvider === "NONE") {
        gatewayPatch.activeCardProvider = "ESNEKPOS";
      }
    } else if (current.iyzico.configured || current.iyzico.enabled) {
      gatewayPatch.iyzicoEnabled = true;
      if (current.activeCardProvider === "NONE") {
        gatewayPatch.activeCardProvider = "IYZICO";
      }
    }

    const gateway = await savePaymentSettings({
      bankTransferEnabled: true,
      activeCardProvider: "ESNEKPOS",
      esnekposEnabled: true,
      esnekposSandbox: process.env.ESNEKPOS_SANDBOX === "true",
      esnekposMerchantId: process.env.ESNEKPOS_MERCHANT_ID || "enaunity.com.tr/",
      esnekposMerchantKey: process.env.ESNEKPOS_SECRET || process.env.ESNEKPOS_MERCHANT_KEY,
      esnekposDisplayName: "Kredi Kartı",
      ...(gatewayPatch as Record<string, unknown>),
    });
    const balance = await updateBalanceTopUpSettings({
      enabled: true,
      splitEnabled: true,
      bankTransferEnabled: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        policies: policyResult,
        gateway: {
          activeCardProvider: gateway.activeCardProvider,
          bankTransferEnabled: gateway.bankTransferEnabled,
          esnekposConfigured: gateway.esnekpos.configured,
        },
        balance,
        message: "Tüm ödeme yöntemleri açıldı. Grup/bayi engelleri kaldırıldı.",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "İşlem başarısız" },
      { status: 500 },
    );
  }
}
