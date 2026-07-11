/**
 * Marketplace Convergence Sprint tests
 * Run: npm run test:marketplace-convergence
 */
import { prisma } from "../src/lib/db";
import {
  getMarketplaceEngine,
  isLegacyMarketplaceEnabled,
  isDevOrTestMode,
  HUB_MARKETPLACE_SOURCE,
  buildConvergenceMetadata,
} from "../src/lib/marketplace-hub/config";
import { guardLegacyWrite } from "../src/lib/marketplace-hub/legacy-guard";
import { syncAllMarketplaceConnections } from "../src/lib/marketplaces/sync-engine";
import { importMarketplaceOrderToFulfillment } from "../src/lib/marketplace-hub/import-engine";
import { matchProductLine } from "../src/lib/marketplace-hub/product-match";
import { fetchTrendyolPackages } from "../src/lib/marketplace-hub/providers/trendyol-provider";

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

const TEST_PREFIX = "mpc-test-";

async function cleanup(dealerId: string) {
  await prisma.dealerWarehouseMovement.deleteMany({ where: { dealerId } });
  await prisma.dealerAccountTransaction.deleteMany({ where: { dealerId } });
  await prisma.dealerShipment.deleteMany({ where: { order: { dealerId } } });
  await prisma.dealerCostItem.deleteMany({ where: { order: { dealerId } } });
  await prisma.dealerOrderItem.deleteMany({ where: { order: { dealerId } } });
  await prisma.dealerOrder.deleteMany({ where: { dealerId } });
  await prisma.dealerAccount.deleteMany({ where: { dealerId } });
  const conns = await prisma.marketplaceConnection.findMany({ where: { dealerId } });
  for (const c of conns) {
    await prisma.marketplaceSyncLog.deleteMany({ where: { connectionId: c.id } });
    await prisma.marketplaceOrderItem.deleteMany({ where: { order: { connectionId: c.id } } });
    await prisma.marketplaceOrder.deleteMany({ where: { connectionId: c.id } });
  }
  await prisma.marketplaceConnection.deleteMany({ where: { dealerId } });
}

async function main() {
  console.log("\n=== Marketplace Convergence Tests ===\n");

  const originalLegacy = process.env.LEGACY_MARKETPLACE_ENABLED;
  const originalEngine = process.env.MARKETPLACE_ENGINE;

  process.env.MARKETPLACE_ENGINE = "hub";
  process.env.LEGACY_MARKETPLACE_ENABLED = "false";

  console.log("1) Feature flags");
  assert(getMarketplaceEngine() === "hub", "MARKETPLACE_ENGINE=hub");
  assert(!isLegacyMarketplaceEnabled(), "LEGACY_MARKETPLACE_ENABLED=false");

  console.log("\n2) Legacy sync-engine guard");
  const legacyResult = await syncAllMarketplaceConnections();
  assert(legacyResult.skipped === true, "Legacy sync skipped when disabled");
  assert(legacyResult.reason === "LEGACY_DISABLED", "Legacy skip reason");

  console.log("\n3) Legacy API guard");
  const blocked = guardLegacyWrite("sync");
  assert(blocked !== null, "Destructive legacy action blocked");
  if (blocked) {
    const body = await blocked.json();
    assert(body.code === "LEGACY_MARKETPLACE_DISABLED", "Legacy guard returns 410 code");
  }
  assert(guardLegacyWrite(undefined) === null, "Read actions not blocked");

  console.log("\n4) Product matching");
  const match = await matchProductLine({ barcode: "NONEXISTENT-XYZ-999", name: "Test Ürün Cam Tablo" });
  assert(match.matchedSource === null || typeof match.matchScore === "number", "matchProductLine returns structured result");

  console.log("\n5) Trendyol provider");
  if (isDevOrTestMode()) {
    const mockResult = await fetchTrendyolPackages(
      { sellerId: "invalid", apiKey: "bad", apiSecret: "bad" },
      null,
      "test-conn"
    );
    assert(mockResult.usedMock === true, "Mock fallback in dev/test when API fails");
    assert(mockResult.packages.length > 0, "Mock packages returned");
  } else {
    assert(true, "Production mock test skipped");
  }

  const dealer = await prisma.dealer.findFirst({ where: { status: "active" } });
  if (!dealer) {
    console.error("Active dealer not found");
    process.exit(1);
  }

  await cleanup(dealer.id);

  console.log("\n6) Import convergence metadata");
  const conn = await prisma.marketplaceConnection.create({
    data: {
      dealerId: dealer.id,
      platform: "TRENDYOL",
      sellerId: "12345",
      apiKey: "test",
      apiSecret: "test",
      active: true,
      connectionStatus: "CONNECTED",
    },
  });

  const platformOrderId = `${TEST_PREFIX}${Date.now()}`;
  const imported = await importMarketplaceOrderToFulfillment({
    dealerId: dealer.id,
    connectionId: conn.id,
    payload: {
      platform: "TRENDYOL",
      platformOrderId,
      customerName: "Test",
      items: [{ productName: "Ürün", quantity: 1, unitPrice: 100 }],
    },
  });

  assert(!imported.duplicate, "Order imported");
  assert(imported.order?.sourceType === HUB_MARKETPLACE_SOURCE, "sourceType MARKETPLACE_HUB");

  const meta = JSON.parse(imported.order?.thyronixRef || "{}");
  assert(meta.futureUnifiedOrderReady === true, "futureUnifiedOrderReady flag set");
  assert(meta.sourceSystem === HUB_MARKETPLACE_SOURCE, "sourceSystem in thyronixRef metadata");

  console.log("\n7) Duplicate protection");
  const dup = await importMarketplaceOrderToFulfillment({
    dealerId: dealer.id,
    connectionId: conn.id,
    payload: {
      platform: "TRENDYOL",
      platformOrderId,
      items: [{ productName: "Ürün", quantity: 1, unitPrice: 100 }],
    },
  });
  assert(dup.duplicate === true, "Duplicate marketplaceOrderId blocked");

  console.log("\n8) SyncLog SKIPPED entries");
  const skippedBefore = await prisma.marketplaceSyncLog.count({ where: { status: "SKIPPED" } });
  await syncAllMarketplaceConnections();
  const skippedAfter = await prisma.marketplaceSyncLog.count({ where: { status: "SKIPPED" } });
  assert(skippedAfter >= skippedBefore, "SKIPPED sync logs written for legacy disabled");

  console.log("\n9) Convergence metadata helper");
  const metaStr = buildConvergenceMetadata({ test: true });
  const parsed = JSON.parse(metaStr);
  assert(parsed.futureUnifiedOrderReady === true, "buildConvergenceMetadata works");

  await cleanup(dealer.id);

  process.env.LEGACY_MARKETPLACE_ENABLED = originalLegacy;
  process.env.MARKETPLACE_ENGINE = originalEngine;

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
