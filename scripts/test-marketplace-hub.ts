/**
 * Marketplace Sync & Auto Fulfillment tests
 * Run: npx tsx scripts/test-marketplace-hub.ts
 */
import { prisma } from "../src/lib/db";
import { importMarketplaceOrderToFulfillment } from "../src/lib/marketplace-hub/import-engine";
import { syncConnection } from "../src/lib/marketplace-hub/sync";
import { handleWebhookEvent } from "../src/lib/marketplace-hub/webhooks";

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

const TEST_PREFIX = "mph-test-";

async function cleanup(dealerId: string) {
  const coreOrders = await prisma.order.findMany({ where: { dealerId } });
  for (const o of coreOrders) {
    await prisma.dealerWarehouseMovement.deleteMany({ where: { coreOrderId: o.id } });
    await prisma.dealerAccountTransaction.deleteMany({ where: { coreOrderId: o.id } });
    await prisma.dealerCostItem.deleteMany({ where: { coreOrderId: o.id } });
    await prisma.dealerShipment.deleteMany({ where: { coreOrderId: o.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: o.id } });
  }
  await prisma.order.deleteMany({ where: { dealerId } });
  await prisma.dealerWarehouseMovement.deleteMany({ where: { dealerId } });
  await prisma.dealerAccountTransaction.deleteMany({ where: { dealerId } });
  await prisma.dealerStatement.deleteMany({ where: { dealerId } });
  await prisma.dealerShipment.deleteMany({ where: { order: { dealerId } } });
  await prisma.dealerCostItem.deleteMany({ where: { order: { dealerId } } });
  await prisma.dealerOrderItem.deleteMany({ where: { order: { dealerId } } });
  await prisma.dealerOrder.deleteMany({ where: { dealerId } });
  await prisma.dealerAccount.deleteMany({ where: { dealerId } });
  await prisma.marketplaceWebhookEvent.deleteMany({ where: { marketplace: "TRENDYOL" } });
  const conns = await prisma.marketplaceConnection.findMany({ where: { dealerId } });
  for (const c of conns) {
    await prisma.marketplaceSyncLog.deleteMany({ where: { connectionId: c.id } });
    await prisma.marketplaceOrderItem.deleteMany({ where: { order: { connectionId: c.id } } });
    await prisma.marketplaceOrder.deleteMany({ where: { connectionId: c.id } });
  }
  await prisma.marketplaceConnection.deleteMany({ where: { dealerId } });
}

async function main() {
  console.log("\n=== Marketplace Hub Tests ===\n");

  const dealer = await prisma.dealer.findFirst({ where: { status: "active" } });
  const dealer2 = await prisma.dealer.findFirst({ where: { status: "active", NOT: { id: dealer?.id } } });
  if (!dealer) {
    console.error("Active dealer not found");
    process.exit(1);
  }

  await cleanup(dealer.id);
  if (dealer2) await cleanup(dealer2.id);

  // 1) Connection
  console.log("1) Marketplace connection");
  const conn = await prisma.marketplaceConnection.create({
    data: {
      dealerId: dealer.id,
      platform: "TRENDYOL",
      sellerId: "12345",
      storeId: "store-1",
      apiKey: "test-key",
      apiSecret: "test-secret",
      connectionStatus: "CONNECTED",
      active: true,
    },
  });
  assert(!!conn.id, "Connection created");
  assert(conn.connectionStatus === "CONNECTED", "Status CONNECTED");

  // 2) Order import
  console.log("\n2) Order import to Core Order");
  const platformOrderId = `${TEST_PREFIX}${Date.now()}`;
  const imported = await importMarketplaceOrderToFulfillment({
    dealerId: dealer.id,
    connectionId: conn.id,
    payload: {
      platform: "TRENDYOL",
      platformOrderId,
      customerName: "Test Müşteri",
      customerCity: "İstanbul",
      items: [{ productName: "Test Ürün", barcode: "TEST001", quantity: 2, unitPrice: 150 }],
    },
  });
  assert(!imported.duplicate, "First import not duplicate");
  assert(imported.order?.fulfillmentStatus === "WAITING_FOR_PACKING", "fulfillmentStatus WAITING_FOR_PACKING");
  const saleTotal = imported.order!.totalAmount ?? (imported.order as any).total;
  assert(saleTotal === 300, "Sale total correct");

  // 3) Duplicate protection
  console.log("\n3) Duplicate protection");
  const dup = await importMarketplaceOrderToFulfillment({
    dealerId: dealer.id,
    connectionId: conn.id,
    payload: {
      platform: "TRENDYOL",
      platformOrderId,
      items: [{ productName: "Test", quantity: 1, unitPrice: 100 }],
    },
  });
  assert(dup.duplicate === true, "Duplicate blocked");

  // 4) Auto cost + accounting
  console.log("\n4) Auto cost & accounting");
  assert(imported.order!.totalCost > 0, "Cost calculated");
  const tx = await prisma.dealerAccountTransaction.findFirst({
    where: {
      OR: [{ orderId: imported.order!.id }, { coreOrderId: imported.order!.id }],
      type: "ORDER_COST",
    },
  });
  assert(!!tx, "ORDER_COST transaction on import");
  assert(tx!.debit > 0, "Debit posted");

  // 5) Stock reservation
  console.log("\n5) Stock reservation");
  const catalogItem = await prisma.productCatalogItem.findFirst();
  if (catalogItem) {
    const withProduct = await importMarketplaceOrderToFulfillment({
      dealerId: dealer.id,
      connectionId: conn.id,
      payload: {
        platform: "TRENDYOL",
        platformOrderId: `${TEST_PREFIX}pl-${Date.now()}`,
        items: [{
          productName: catalogItem.name,
          barcode: catalogItem.barcode,
          sku: catalogItem.sku,
          quantity: 1,
          unitPrice: 200,
          imageUrl: "https://example.com/test.jpg",
        }],
      },
    });
    const movement = await prisma.dealerWarehouseMovement.findFirst({
      where: {
        OR: [{ orderId: withProduct.order!.id }, { coreOrderId: withProduct.order!.id }],
        movementType: "RESERVE",
      },
    });
    const coreMovement = await prisma.stockMovement.findFirst({
      where: { orderId: withProduct.order!.id, type: { in: ["RESERVE", "reserve"] } },
    });
    assert(!!movement || !!coreMovement, "Stock reserved for catalog item");
  } else {
    console.log("  ⚠ No catalog item — skip stock test");
  }

  // 6) Sync with logs
  console.log("\n6) Sync engine + logs");
  const syncResult = await syncConnection(conn.id);
  assert(typeof syncResult.newOrders === "number", "Sync returns metrics");
  const log = await prisma.marketplaceSyncLog.findFirst({ where: { connectionId: conn.id } });
  assert(!!log, "Sync log created");

  // 7) Webhook
  console.log("\n7) Webhook handler");
  const whOrderId = `${TEST_PREFIX}wh-${Date.now()}`;
  await handleWebhookEvent({
    marketplace: "TRENDYOL",
    eventType: "NEW_ORDER",
    connectionId: conn.id,
    payload: {
      dealerId: dealer.id,
      connectionId: conn.id,
      orderId: whOrderId,
      customerName: "Webhook Müşteri",
      items: [{ productName: "Webhook Ürün", quantity: 1, unitPrice: 99 }],
    },
  });
  const whOrder = await prisma.order.findFirst({
    where: { dealerId: dealer.id, marketplaceOrderId: whOrderId },
  });
  assert(!!whOrder, "Webhook creates core order");

  // 8) Dealer isolation
  console.log("\n8) Dealer isolation");
  if (dealer2) {
    const conn2 = await prisma.marketplaceConnection.create({
      data: {
        dealerId: dealer2.id,
        platform: "TRENDYOL",
        sellerId: "99999",
        apiKey: "k2",
        connectionStatus: "CONNECTED",
        active: true,
      },
    });
    const other = await importMarketplaceOrderToFulfillment({
      dealerId: dealer2.id,
      connectionId: conn2.id,
      payload: {
        platform: "TRENDYOL",
        platformOrderId: `${TEST_PREFIX}iso-${Date.now()}`,
        items: [{ productName: "Other", quantity: 1, unitPrice: 50 }],
      },
    });
    const dealer1Orders = await prisma.order.findMany({ where: { dealerId: dealer.id } });
    assert(!dealer1Orders.some((o) => o.id === other.order!.id), "Dealer isolation");
    await cleanup(dealer2.id);
  } else {
    console.log("  ⚠ Second dealer not found — skip isolation");
  }

  await cleanup(dealer.id);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
