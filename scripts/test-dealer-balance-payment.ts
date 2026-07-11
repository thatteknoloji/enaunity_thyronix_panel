/**
 * Dealer Balance Payment V1 tests
 * Run: npx tsx scripts/test-dealer-balance-payment.ts
 */
import {
  assertPaymentModeAllowed,
  buildCheckoutPaymentContext,
  type CheckoutPaymentContext,
  roundMoney,
} from "../src/lib/payments/checkout-payment-service";
import { getBalanceTopUpSettings } from "../src/lib/payments/balance-topup-settings";

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
  console.log("\n=== DEALER_BALANCE_PAYMENT_V1 ===\n");

  assert(roundMoney(5000.005) === 5000.01, "roundMoney 2 ondalık");
  assert(roundMoney(5000.004) === 5000, "roundMoney yuvarlama");

  const ctx3250: CheckoutPaymentContext = {
    availableBalance: 3250,
    cartTotal: 5000,
    canPayFullBalance: false,
    canSplit: true,
    canCardOnly: true,
    split: { balancePortion: 3250, cardPortion: 1750 },
    methods: ["SPLIT", "CARD_ONLY"],
    splitEnabled: true,
    balanceEnabled: true,
    shortfall: 1750,
  };

  assert(!assertPaymentModeAllowed(ctx3250, "BALANCE_ONLY").ok, "5000 sepet 3250 bakiye — tam bakiye blok");
  assert(assertPaymentModeAllowed(ctx3250, "SPLIT").ok, "split izinli");
  assert(assertPaymentModeAllowed(ctx3250, "CARD_ONLY").ok, "tam kart izinli");

  const ctx5000: CheckoutPaymentContext = {
    ...ctx3250,
    availableBalance: 5000,
    canPayFullBalance: true,
    canSplit: false,
    split: { balancePortion: 5000, cardPortion: 0 },
    methods: ["BALANCE_ONLY", "CARD_ONLY"],
    shortfall: 0,
  };
  assert(assertPaymentModeAllowed(ctx5000, "BALANCE_ONLY").ok, "tam bakiye yeterli");

  const settings = await getBalanceTopUpSettings();
  assert(settings.minAmount >= 5000, "default min top-up 5000");

  const fs = await import("fs");
  assert(fs.existsSync("src/lib/payments/balance-topup-service.ts"), "topup service");
  assert(fs.existsSync("src/components/payments/DealerCheckoutPaymentPanel.tsx"), "dealer checkout panel");
  assert(fs.existsSync("prisma/migrations/20260624190000_dealer_balance_topup_v1/migration.sql"), "migration");

  console.log(`\n--- Sonuç: ${passed} geçti, ${failed} başarısız ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
