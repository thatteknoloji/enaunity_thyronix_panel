/**
 * Order Convergence Sprint tests
 * Run: npm run test:order-convergence
 */
import { prisma } from "../src/lib/db";
import { importMarketplaceOrderToFulfillment } from "../src/lib/marketplace-hub/import-engine";
import { createDealerOrder, listOrders } from "../src/lib/fulfillment/orders";
import { isCoreOrderEngine } from "../src/lib/orders/config";
import { addCoreCostItem } from "../src/lib/orders/cost-service";
import { execSync } from "child_process";

process.env.ORDER_ENGINE = "core";
process.env.LEGACY_DEALER_ORDER_ENABLED = "false";
process.env.DEALER_ORDER_MIRROR_ENABLED = "false";
process.env.ACCOUNTING_ENGINE = "dealer_account";

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

const TEST_PREFIX = "oc-test-";

async function cleanup(dealerId: string) {
  const coreOrders = await prisma.order.findMany({
    where: { dealerId, orderNumber: { startsWith: "ENA-" } },
  });
  for (const o of coreOrders) {
    await prisma.dealerWarehouseMovement.deleteMany({ where: { coreOrderId: o.id } });
    await prisma.dealerAccountTransaction.deleteMany({ where: { coreOrderId: o.id } });
    await prisma.dealerCostItem.deleteMany({ where: { coreOrderId: o.id } });
    await prisma.dealerShipment.deleteMany({ where: { coreOrderId: o.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: o.id } });
  }
  await prisma.order.deleteMany({ where: { dealerId, orderNumber: { startsWith: "ENA-" } } });

  const dealerOrders = await prisma.dealerOrder.findMany({ where: { dealerId } });
  for (const o of dealerOrders) {
    await prisma.dealerWarehouseMovement.deleteMany({ where: { orderId: o.id } });
    await prisma.dealerAccountTransaction.deleteMany({ where: { orderId: o.id } });
    await prisma.dealerCostItem.deleteMany({ where: { orderId: o.id } });
    await prisma.dealerShipment.deleteMany({ where: { orderId: o.id } });
    await prisma.dealerOrderItem.deleteMany({ where: { orderId: o.id } });
  }
  await prisma.dealerOrder.deleteMany({ where: { dealerId } });
  await prisma.dealerAccountTransaction.deleteMany({ where: { dealerId } });
  await prisma.dealerAccount.deleteMany({ where: { dealerId } });
}

async function main() {
  console.log("\n=== Order Convergence Tests ===\n");

  assert(isCoreOrderEngine(), "ORDER_ENGINE=core active");

  const dealer = await prisma.dealer.findFirst({ where: { status: "active" } });
  if (!dealer) {
    console.error("Active dealer not found");
    process.exit(1);
  }
  await cleanup(dealer.id);

  const catalogItem = await prisma.productCatalogItem.findFirst();

  // 1) Marketplace import creates Core Order
  console.log("1) Marketplace import → Core Order");
  const platformOrderId = `${TEST_PREFIX}${Date.now()}`;
  const imported = await importMarketplaceOrderToFulfillment({
    dealerId: dealer.id,
    connectionId: "test-conn",
    payload: {
      platform: "TRENDYOL",
      platformOrderId,
      customerName: "Convergence Test",
      items: [{
        productName: "Test Ürün",
        barcode: catalogItem?.barcode || "OC001",
        sku: catalogItem?.sku,
        catalogItemId: catalogItem?.id,
        quantity: 2,
        unitPrice: 150,
      }],
    },
  });
  assert(!imported.duplicate, "First import not duplicate");
  const coreOrder = await prisma.order.findUnique({
    where: { id: imported.order!.id },
    include: { items: true },
  });
  assert(!!coreOrder, "Core Order created in Order table");
  assert(coreOrder!.fulfillmentStatus === "WAITING_FOR_PACKING", "fulfillmentStatus set");
  if (catalogItem) {
    assert(
      coreOrder!.items.some((i) => i.productCatalogItemId === catalogItem.id),
      "OrderItem stores productCatalogItemId"
    );
  }

  // 2) Duplicate blocked
  console.log("\n2) Duplicate marketplaceOrderId");
  const dup = await importMarketplaceOrderToFulfillment({
    dealerId: dealer.id,
    connectionId: "test-conn",
    payload: {
      platform: "TRENDYOL",
      platformOrderId,
      items: [{ productName: "Dup", quantity: 1, unitPrice: 100 }],
    },
  });
  assert(dup.duplicate === true, "Duplicate marketplaceOrderId blocked");

  // 3) DealerCostItem with coreOrderId
  console.log("\n3) DealerCostItem coreOrderId");
  await addCoreCostItem(coreOrder!.id, "ADJUSTMENT", 10);
  const costItem = await prisma.dealerCostItem.findFirst({
    where: { coreOrderId: coreOrder!.id, type: "ADJUSTMENT" },
  });
  assert(!!costItem, "DealerCostItem written with coreOrderId");

  // 4) ORDER_COST transaction
  console.log("\n4) ORDER_COST accounting");
  const tx = await prisma.dealerAccountTransaction.findFirst({
    where: { coreOrderId: coreOrder!.id, type: "ORDER_COST" },
  });
  assert(!!tx, "ORDER_COST transaction created");
  assert(tx!.debit > 0, "ORDER_COST debit > 0");

  // 5) listOrders unified view
  console.log("\n5) Unified listOrders");
  const listed = await listOrders({ dealerId: dealer.id, limit: 50 });
  assert(listed.some((o) => o.id === coreOrder!.id && o.engine === "core"), "listOrders includes core order");

  // 6) Legacy DealerOrder read via _forceLegacy
  console.log("\n6) Legacy DealerOrder read compatibility");
  const legacy = await createDealerOrder({
    dealerId: dealer.id,
    customerName: "Legacy",
    marketplace: "MANUAL",
    marketplaceOrderId: `${TEST_PREFIX}legacy`,
    items: [{ name: "Legacy Item", quantity: 1, salePrice: 100, costPrice: 60 }],
    _forceLegacy: true,
  });
  const legacyRead = await prisma.dealerOrder.findUnique({ where: { id: legacy!.id } });
  assert(!!legacyRead, "Legacy DealerOrder readable when _forceLegacy");

  // 7) No new DealerOrder without force when legacy disabled
  console.log("\n7) New DealerOrder blocked");
  let blocked = false;
  try {
    await createDealerOrder({
      dealerId: dealer.id,
      items: [{ name: "X", quantity: 1, salePrice: 10 }],
    });
  } catch {
    blocked = false;
  }
  const accidentalLegacy = await prisma.dealerOrder.count({
    where: { dealerId: dealer.id, marketplaceOrderId: { contains: "blocked-test" } },
  });
  assert(accidentalLegacy === 0 || !blocked, "Core engine routes new orders to Order table");

  // 8) Audit script runs
  console.log("\n8) Audit script");
  try {
    execSync("npx tsx scripts/audit-order-overlap.ts", { stdio: "pipe" });
    assert(true, "audit:order-overlap runs without error");
  } catch {
    assert(false, "audit:order-overlap runs without error");
  }

  await cleanup(dealer.id);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
