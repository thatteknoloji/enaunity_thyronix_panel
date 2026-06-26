/**
 * ENA_DROPSHIP_STABILIZE_V1 tests
 * Run: npx tsx scripts/test-dropship-stabilize.ts
 */
import {
  getCheckoutPaymentNotice,
  PAYMENT_MODEL_LABELS,
  resolveStorePaymentDisplayModel,
  STORE_NOTIFICATION_NOT_CONFIGURED,
  STORE_PAYMENT_STATUS_PENDING_MANUAL,
} from "../src/lib/dropship/payment-display";
import {
  buildNewStoreOrderMetadata,
  formatStoreOrderLabel,
  generateStoreOrderNumber,
} from "../src/lib/dropship/order-metadata";
import { DROPSHIP_MODULE_KEY } from "../src/lib/dropship/gateway-state";

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

function main() {
  console.log("ENA_DROPSHIP_STABILIZE_V1 tests\n");

  assert(DROPSHIP_MODULE_KEY === "AI_DROPSHIP", "module key AI_DROPSHIP");

  assert(resolveStorePaymentDisplayModel("PLATFORM") === "PLATFORM_PAYMENT", "PLATFORM → PLATFORM_PAYMENT");
  assert(resolveStorePaymentDisplayModel("DEALER") === "DEALER_PAYMENT", "DEALER → DEALER_PAYMENT");
  assert(resolveStorePaymentDisplayModel("") === "MANUAL_ORDER", "empty → MANUAL_ORDER");

  const platformCheckout = getCheckoutPaymentNotice("PLATFORM");
  assert(platformCheckout.label === PAYMENT_MODEL_LABELS.PLATFORM_PAYMENT, "checkout PLATFORM label");
  assert(platformCheckout.manualNotice !== null, "online ödeme kapalı → manual notice");

  const dealerCheckout = getCheckoutPaymentNotice("DEALER");
  assert(dealerCheckout.displayModel === "DEALER_PAYMENT", "checkout DEALER model");

  const orderNo = generateStoreOrderNumber(new Date("2026-06-26T12:00:00.000Z"));
  assert(orderNo.startsWith("DS-20260626-"), `order number format: ${orderNo}`);

  const meta = buildNewStoreOrderMetadata();
  assert(meta.paymentStatus === STORE_PAYMENT_STATUS_PENDING_MANUAL, "paymentStatus PENDING_MANUAL");
  assert(meta.notificationStatus === STORE_NOTIFICATION_NOT_CONFIGURED, "notificationStatus NOT_CONFIGURED");
  assert(!!meta.orderNumber, "orderNumber üretildi");

  assert(formatStoreOrderLabel({ orderNumber: "DS-1", id: "cuid" }) === "DS-1", "formatStoreOrderLabel orderNumber");
  assert(formatStoreOrderLabel({ orderNumber: null, id: "abc123" }) === "abc123", "formatStoreOrderLabel fallback id");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
