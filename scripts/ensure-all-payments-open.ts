/**
 * Tüm ödeme yöntemlerini aç (production CLI)
 * Run: npx tsx scripts/ensure-all-payments-open.ts
 */
import { ensureAllPaymentsOpen } from "../src/lib/payments/payment-method-policy";
import { getPaymentSettings, savePaymentSettings } from "../src/lib/payments/payment-settings";
import { updateBalanceTopUpSettings } from "../src/lib/payments/balance-topup-settings";

async function main() {
  const policyResult = await ensureAllPaymentsOpen("ensure-all-payments-open-script");
  console.log("Politika:", policyResult);

  const current = await getPaymentSettings();
  const gatewayPatch: Record<string, unknown> = { bankTransferEnabled: true };

  if (current.esnekpos.configured || current.esnekpos.enabled) {
    gatewayPatch.esnekposEnabled = true;
    if (current.activeCardProvider === "NONE") gatewayPatch.activeCardProvider = "ESNEKPOS";
  } else if (current.iyzico.configured || current.iyzico.enabled) {
    gatewayPatch.iyzicoEnabled = true;
    if (current.activeCardProvider === "NONE") gatewayPatch.activeCardProvider = "IYZICO";
  }

  const gateway = await savePaymentSettings(gatewayPatch);
  const balance = await updateBalanceTopUpSettings({
    enabled: true,
    splitEnabled: true,
    bankTransferEnabled: true,
  });

  console.log("Gateway:", {
    activeCardProvider: gateway.activeCardProvider,
    bankTransferEnabled: gateway.bankTransferEnabled,
    esnekpos: gateway.esnekpos,
  });
  console.log("Bakiye:", balance);
  console.log("✓ Tüm ödeme yöntemleri açıldı");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
