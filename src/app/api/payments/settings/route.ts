import { NextResponse } from "next/server";
import { resolveDealerPaymentMethods } from "@/lib/payments/payment-method-policy";
import { getPaymentSettings } from "@/lib/payments/payment-settings";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dealerId = searchParams.get("dealerId");
    const settings = await getPaymentSettings();

    if (!dealerId) {
      const { getPublicPaymentSettings } = await import("@/lib/payments/payment-settings");
      const data = await getPublicPaymentSettings();
      return NextResponse.json({ success: true, data });
    }

    const resolved = await resolveDealerPaymentMethods(dealerId);
    const card = settings.activeCardProvider === "ESNEKPOS" ? settings.esnekpos : settings.iyzico;

    return NextResponse.json({
      success: true,
      data: {
        methods: resolved.methods,
        balanceEnabled: resolved.balanceEnabled,
        bankTransferEnabled: resolved.bankTransferEnabled,
        cardEnabled: resolved.cardEnabled,
        bankTransferEnabledGlobal: settings.bankTransferEnabled,
        activeCardProvider: settings.activeCardProvider,
        cardDisplayName: card.displayName,
        extraFeePercent: card.extraFeePercent,
        extraFeeFixed: card.extraFeeFixed,
        installmentsEnabled: card.installmentsEnabled,
        maxInstallments: card.maxInstallments,
        minAmount: card.minAmount,
        checkoutTitle: settings.checkoutTitle,
        checkoutDescription: settings.checkoutDescription,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Ayarlar okunamadı" }, { status: 500 });
  }
}
