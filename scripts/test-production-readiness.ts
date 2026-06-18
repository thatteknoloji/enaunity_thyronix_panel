/**
 * Production Readiness tests
 * Run: npm run test:production-readiness
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

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

function fileExists(rel: string) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readEnvExample() {
  const p = path.join(ROOT, ".env.production.example");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : "";
}

async function main() {
  console.log("\n=== Production Readiness Tests ===\n");

  // 1. Payment providers
  console.log("1) Ödeme provider dosyaları");
  assert(fileExists("src/lib/payments/esnekpos-provider.ts"), "EsnekPOS provider dosyası");
  assert(fileExists("src/lib/payments/iyzico-provider.ts"), "İyzico provider dosyası");
  assert(fileExists("src/lib/payments/gateway-config.ts"), "Gateway config");
  assert(fileExists("src/app/api/payments/callback/esnekpos/route.ts"), "EsnekPOS callback route");
  assert(fileExists("src/app/api/payments/callback/iyzico/route.ts"), "İyzico callback route");
  assert(fileExists("src/app/api/payments/webhook/iyzico/route.ts"), "İyzico webhook route");

  // 2. HIVE config
  console.log("\n2) HIVE config");
  assert(fileExists("src/lib/hive/config.ts"), "HIVE config dosyası");
  assert(fileExists("src/app/api/hive/status/route.ts"), "HIVE status API");

  // 3. Production env example
  console.log("\n3) Production env");
  const envExample = readEnvExample();
  assert(envExample.length > 0, ".env.production.example mevcut");
  assert(envExample.includes("MARKETPLACE_ENGINE=hub"), "MARKETPLACE_ENGINE=hub");
  assert(envExample.includes("ACCOUNTING_ENGINE=dealer_account"), "ACCOUNTING_ENGINE=dealer_account");
  assert(envExample.includes("ORDER_ENGINE=core"), "ORDER_ENGINE=core");
  assert(envExample.includes("WAREHOUSE_ENGINE=core"), "WAREHOUSE_ENGINE=core");
  assert(envExample.includes("INVOICE_ENGINE=invoice_model"), "INVOICE_ENGINE=invoice_model");
  assert(envExample.includes("ESNEKPOS_ENABLED"), "EsnekPOS env vars");
  assert(envExample.includes("IYZICO_ENABLED"), "İyzico env vars");
  assert(envExample.includes("HIVE_ENABLED"), "HIVE env vars");
  assert(envExample.includes("CRON_SECRET"), "CRON_SECRET");

  // 4. Docs
  console.log("\n4) Dokümantasyon");
  assert(fileExists("docs/PRODUCTION_SOFT_LAUNCH_CHECKLIST.md"), "Soft launch checklist");
  assert(fileExists("docs/CARGO_INTEGRATION_REPORT.md"), "Kargo entegrasyon raporu");

  // 5. Cron routes
  console.log("\n5) Cron route'ları");
  assert(fileExists("src/app/api/cron/marketplace-sync/route.ts"), "Marketplace sync cron");
  assert(fileExists("src/app/api/cron/nexa-sync/route.ts"), "Nexa sync cron");
  assert(fileExists("src/app/api/cron/thyronix-sync/route.ts"), "Thyronix sync cron");

  // 6. Fulfillment shipment PATCH
  console.log("\n6) Kargo minimum bağlantı");
  const shipmentRoute = fs.readFileSync(path.join(ROOT, "src/app/api/fulfillment/shipments/route.ts"), "utf-8");
  assert(shipmentRoute.includes("export async function PATCH"), "Fulfillment shipment PATCH mevcut");

  // 7. Convergence config files
  console.log("\n7) Convergence config");
  assert(fileExists("src/lib/marketplace-hub/config.ts"), "Marketplace hub config");
  assert(fileExists("src/lib/accounting/config.ts"), "Accounting config");
  assert(fileExists("src/lib/orders/config.ts"), "Order config");
  assert(fileExists("src/lib/warehouse/config.ts"), "Warehouse config");
  assert(fileExists("src/lib/invoices/config.ts"), "Invoice config");

  console.log(`\n=== Sonuç: ${passed} geçti, ${failed} başarısız ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
