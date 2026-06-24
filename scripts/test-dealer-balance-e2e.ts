/**
 * Dealer balance payment — E2E checklist + API smoke
 * Run: npx tsx scripts/test-dealer-balance-e2e.ts
 *
 * Gerçek kart akışı (EsnekPOS sandbox/canlı) manuel doğrulanmalıdır — aşağıdaki MANUAL_STEPS.
 */
import { prisma } from "../src/lib/db";
import { getBalanceTopUpSettings } from "../src/lib/payments/balance-topup-settings";
import { buildCheckoutPaymentContext } from "../src/lib/payments/checkout-payment-service";
import { getPaymentSettings } from "../src/lib/payments/payment-settings";

const MANUAL_STEPS = `
=== MANUEL E2E (sandbox veya production) ===
1. Admin → Ödeme Altyapısı → EsnekPOS: Merchant ID/Key, sandbox kapat (canlı) veya sandbox açık (test)
2. Admin → Bakiye sekmesi: min tutar, split açık
3. Bayi giriş → /dealer/balance → kart ile min tutar top-up → EsnekPOS 3DS tamamla → bakiye artışı
4. /checkout → sepet > bakiye → SPLIT seç → kart kısmı EsnekPOS → onay sonrası sipariş + bakiye düşümü
5. /payment/checkout?type=module&moduleKey=...&planKey=... → tam bakiye veya split modül satın alma
6. Havale top-up → admin /admin/dealer-balance-topups onay → bakiye artışı
`;

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

async function main() {
  console.log("\n=== DEALER_BALANCE_E2E_SMOKE ===\n");

  const settings = await getBalanceTopUpSettings();
  assert(settings.enabled, "balance top-up enabled in settings");
  assert(settings.minAmount >= 1000, "min top-up configured");

  const gw = await prisma.paymentGatewaySettings.findUnique({ where: { id: "default" } });
  assert(!!gw, "payment gateway settings row exists");

  const paySettings = await getPaymentSettings();
  const esnekConfigured =
  Boolean(process.env.ESNEKPOS_MERCHANT_ID && process.env.ESNEKPOS_MERCHANT_KEY) ||
    Boolean(gw?.esnekposMerchantId);
  console.log(
    `  ℹ EsnekPOS credential: ${esnekConfigured ? "yapılandırılmış" : "EKSİK — production kart top-up/split için gerekli"}`
  );

  const sampleDealer = await prisma.dealer.findFirst({
    where: { status: "approved" },
    select: { id: true, balance: true },
  });
  if (sampleDealer) {
    const ctx = await buildCheckoutPaymentContext({
      dealerId: sampleDealer.id,
      cartTotal: 5000,
      balanceEnabled: true,
    });
    assert(ctx.cartTotal === 5000, "checkout context cart total");
    assert(Array.isArray(ctx.methods), "checkout methods array");
  } else {
    console.log("  ⚠ Onaylı bayi yok — context smoke atlandı");
  }

  const fs = await import("fs");
  assert(fs.existsSync("src/lib/payments/module-checkout-payment-service.ts"), "module checkout service");
  assert(fs.existsSync("src/app/payment/checkout/page.tsx"), "payment checkout page");
  assert(
    fs.readFileSync("src/app/payment/checkout/page.tsx", "utf8").includes("DealerCheckoutPaymentPanel"),
    "payment checkout uses dealer panel"
  );
  assert(
    fs.readFileSync("src/app/admin/payments/gateways/page.tsx", "utf8").includes('key: "balance"'),
    "gateways balance tab"
  );

  console.log(MANUAL_STEPS);
  console.log(`\n--- Sonuç: ${passed} geçti, ${failed} başarısız ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
