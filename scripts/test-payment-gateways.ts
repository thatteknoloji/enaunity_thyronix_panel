/**
 * Payment Gateway MVP tests
 * Run: npm run test:payment-gateways
 */
import { prisma } from "../src/lib/db";
import {
  getAvailablePaymentMethods,
  isEsnekposEnabled,
  isIyzicoEnabled,
  providerConfigured,
  resolveProviderKey,
} from "../src/lib/payments/gateway-config";
import { createProviderByKey } from "../src/lib/payments/payment-provider-factory";
import { createEsnekposProvider } from "../src/lib/payments/esnekpos-provider";
import { createIyzicoProvider } from "../src/lib/payments/iyzico-provider";
import { approvePayment } from "../src/lib/payments/payment-service";
import { processPaymentSuccess } from "../src/lib/payments/payment-callback-service";
import { logPaymentWebhook } from "../src/lib/payments/webhook-service";
import {
  requestPackagePurchase,
  grantProductLibraryAccessFromPayment,
} from "../src/lib/product-library/package-access-service";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

async function ensureTestDealer() {
  let dealer = await prisma.dealer.findFirst({ where: { email: "pg-test@ena.com" } });
  if (!dealer) {
    dealer = await prisma.dealer.create({
      data: {
        name: "PG Test",
        title: "PG Test",
        email: "pg-test@ena.com",
        phone: "5550000001",
        company: "PG Test Ltd",
        location: "Istanbul",
        companySize: "1-10",
        markets: "TR",
        status: "active",
      },
    });
  }
  return dealer;
}

async function ensureTestPackage() {
  let pkg = await prisma.productPackage.findFirst({ where: { slug: "pg-test-pkg" } });
  if (!pkg) {
    pkg = await prisma.productPackage.create({
      data: {
        name: "PG Test Paket",
        slug: "pg-test-pkg",
        description: "Payment gateway test",
        licenseLevel: "STARTER",
        status: "ACTIVE",
        billingType: "ONE_TIME",
        oneTimePrice: 99,
        monthlyPrice: 0,
        yearlyPrice: 0,
        isFree: false,
      },
    });
  }
  return pkg;
}

async function cleanup(dealerId: string, packageId: string) {
  await prisma.productPackageAccess.deleteMany({ where: { dealerId, packageId } });
  await prisma.modulePayment.deleteMany({ where: { dealerId, moduleKey: "PRODUCT_LIBRARY" } });
  await prisma.moduleLicense.deleteMany({ where: { dealerId, moduleKey: "PRODUCT_LIBRARY" } });
  await prisma.paymentWebhookLog.deleteMany({ where: { provider: { in: ["ESNEKPOS", "IYZICO", "TEST"] } } });
}

async function main() {
  console.log("\n=== Payment Gateway Tests ===\n");

  // 1. Provider files exist
  console.log("1) Provider factory");
  assert(createProviderByKey("ESNEKPOS").key === "ESNEKPOS", "EsnekPOS provider oluşturuluyor");
  assert(createProviderByKey("IYZICO").key === "IYZICO", "İyzico provider oluşturuluyor");
  assert(createProviderByKey("MANUAL").key === "MANUAL", "Manuel provider oluşturuluyor");

  // 2. Gateway config
  console.log("\n2) Gateway config");
  const methods = getAvailablePaymentMethods();
  assert(methods.includes("BANK_TRANSFER"), "Havale/EFT her zaman mevcut");
  assert(typeof isEsnekposEnabled() === "boolean", "EsnekPOS enabled flag okunuyor");
  assert(typeof isIyzicoEnabled() === "boolean", "İyzico enabled flag okunuyor");
  assert(resolveProviderKey("BANK_TRANSFER") === "MANUAL", "Havale → MANUAL provider");
  assert(resolveProviderKey("ESNEKPOS") === "ESNEKPOS", "EsnekPOS provider key");
  assert(resolveProviderKey("IYZICO") === "IYZICO", "İyzico provider key");

  // 3. Sandbox payment creation
  console.log("\n3) Sandbox ödeme oluşturma");
  const esnek = createEsnekposProvider();
  const esnekResult = await esnek.createPayment({
    dealerId: "test",
    moduleKey: "PRODUCT_LIBRARY",
    planKey: "test-plan",
    amount: 99,
    currency: "TRY",
    paymentType: "CARD",
    metadata: { paymentId: "test-esnek-001" },
  });
  assert(esnekResult.success === true, "EsnekPOS sandbox createPayment başarılı");
  assert(Boolean(esnekResult.redirectUrl), "EsnekPOS redirectUrl döndürüyor");

  const iyzico = createIyzicoProvider();
  const iyzicoResult = await iyzico.createPayment({
    dealerId: "test",
    moduleKey: "PRODUCT_LIBRARY",
    planKey: "test-plan",
    amount: 99,
    currency: "TRY",
    paymentType: "CARD",
    metadata: { paymentId: "test-iyzico-001" },
  });
  assert(iyzicoResult.success === true, "İyzico sandbox createPayment başarılı");
  assert(Boolean(iyzicoResult.redirectUrl), "İyzico redirectUrl döndürüyor");

  // 4. Webhook log
  console.log("\n4) Webhook log");
  const log = await logPaymentWebhook({
    provider: "TEST",
    eventType: "test",
    providerReference: "ref-001",
    payload: { status: "success" },
    status: "RECEIVED",
  });
  assert(Boolean(log.id), "PaymentWebhookLog oluşturuldu");

  // 5. Product library bank transfer flow
  console.log("\n5) Product Library Havale/EFT akışı");
  const dealer = await ensureTestDealer();
  const pkg = await ensureTestPackage();
  await cleanup(dealer.id, pkg.id);

  const bankResult = await requestPackagePurchase(dealer.id, pkg.id, { paymentMethod: "BANK_TRANSFER" });
  assert(bankResult.free === false, "Ücretli paket — free değil");
  assert(Boolean(bankResult.paymentId), "ModulePayment oluşturuldu");
  assert(bankResult.paymentMethod === "BANK_TRANSFER", "Havale/EFT yöntemi");

  const pendingAccess = await prisma.productPackageAccess.findUnique({
    where: { packageId_dealerId: { packageId: pkg.id, dealerId: dealer.id } },
  });
  assert(pendingAccess?.status === "PENDING", "ProductPackageAccess PENDING");

  const approveResult = await approvePayment(bankResult.paymentId!);
  assert(approveResult.success, "Admin onayı başarılı");

  const activeAccess = await prisma.productPackageAccess.findUnique({
    where: { packageId_dealerId: { packageId: pkg.id, dealerId: dealer.id } },
  });
  assert(activeAccess?.status === "ACTIVE", "ProductPackageAccess ACTIVE");

  // 6. Gateway callback success
  console.log("\n6) Gateway callback");
  await cleanup(dealer.id, pkg.id);
  const gatewayPurchase = await requestPackagePurchase(dealer.id, pkg.id, { paymentMethod: "BANK_TRANSFER" });
  const callbackResult = await processPaymentSuccess(gatewayPurchase.paymentId!, "MANUAL");
  assert(callbackResult.success, "processPaymentSuccess çalışıyor");

  const paidPayment = await prisma.modulePayment.findUnique({ where: { id: gatewayPurchase.paymentId! } });
  assert(paidPayment?.status === "PAID", "ModulePayment PAID");

  // Cleanup
  await cleanup(dealer.id, pkg.id);
  await prisma.paymentWebhookLog.delete({ where: { id: log.id } }).catch(() => {});

  console.log(`\n=== Sonuç: ${passed} geçti, ${failed} başarısız ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
