/**
 * Fulfillment & Dealer Accounting Foundation tests
 * Run: npx tsx scripts/test-fulfillment.ts
 */
import { prisma } from "../src/lib/db";
import { createDealerOrder, updateOrderStatus, getOrderDetail, listOrders } from "../src/lib/fulfillment/orders";
import { recalculateOrderCosts } from "../src/lib/fulfillment/costs";
import { ensureDealerAccount, postTransaction, generateMonthlyStatement } from "../src/lib/fulfillment/accounts";
import { recordWarehouseMovement } from "../src/lib/fulfillment/warehouse";

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

const TEST_PREFIX = "ff-test-";

async function cleanup(dealerId: string) {
  const orders = await prisma.dealerOrder.findMany({ where: { dealerId, orderNumber: { startsWith: "ENA-" } } });
  for (const o of orders) {
    await prisma.dealerWarehouseMovement.deleteMany({ where: { orderId: o.id } });
    await prisma.dealerAccountTransaction.deleteMany({ where: { orderId: o.id } });
    await prisma.dealerCostItem.deleteMany({ where: { orderId: o.id } });
    await prisma.dealerShipment.deleteMany({ where: { orderId: o.id } });
    await prisma.dealerOrderItem.deleteMany({ where: { orderId: o.id } });
  }
  await prisma.dealerOrder.deleteMany({ where: { dealerId } });
  await prisma.dealerStatement.deleteMany({ where: { dealerId } });
  await prisma.dealerAccountTransaction.deleteMany({ where: { dealerId } });
  await prisma.dealerAccount.deleteMany({ where: { dealerId } });
  await prisma.dealerWarehouseMovement.deleteMany({ where: { dealerId } });
}

async function main() {
  process.env.ORDER_ENGINE = "dealer_order";
  process.env.LEGACY_DEALER_ORDER_ENABLED = "true";
  process.env.WAREHOUSE_ENGINE = "dealer_warehouse";
  process.env.LEGACY_DEALER_WAREHOUSE_ENABLED = "true";

  console.log("\n=== Fulfillment & Dealer Accounting Tests ===\n");

  const dealer = await prisma.dealer.findFirst({ where: { status: "active" } });
  const dealer2 = await prisma.dealer.findFirst({ where: { status: "active", NOT: { id: dealer?.id } } });

  if (!dealer) {
    console.error("Active dealer not found — run seed first");
    process.exit(1);
  }

  await cleanup(dealer.id);
  if (dealer2) await cleanup(dealer2.id);

  // 1) Order creation
  console.log("1) Order creation");
  const order = await createDealerOrder({
    dealerId: dealer.id,
    customerName: "Test Müşteri",
    customerCity: "İstanbul",
    marketplace: "Trendyol",
    marketplaceOrderId: `${TEST_PREFIX}123`,
    items: [
      { name: "Test Ürün", sku: "SKU-1", quantity: 2, salePrice: 500, costPrice: 300 },
    ],
    shippingCost: 90,
    packagingCost: 15,
    serviceCost: 20,
    _forceLegacy: true,
  });
  assert(!!order?.id, "Order created");
  assert(order!.totalAmount === 1000, "Sale total calculated");
  assert(order!.totalCost > 0, "Cost calculated");

  // 2) Cost engine
  console.log("\n2) Cost engine");
  const costs = await recalculateOrderCosts(order!.id);
  assert(costs!.totalCost === 600 + 90 + 15 + 20, "Cost breakdown includes all items");
  assert(costs!.totalProfit === 1000 - costs!.totalCost, "Profit calculated");

  // 3) Account transactions
  console.log("\n3) Account transactions");
  const account = await ensureDealerAccount(dealer.id);
  assert(!!account.id, "Dealer account ensured");
  const balanceBefore = account.currentBalance;

  await postTransaction({
    dealerId: dealer.id,
    type: "PAYMENT",
    title: "Test ödeme",
    credit: 500,
  });

  const updated = await prisma.dealerAccount.findUnique({ where: { dealerId: dealer.id } });
  assert(updated!.currentBalance === balanceBefore + 500, "Payment increases balance (credit)");

  // 4) Order shipped → account debit
  console.log("\n4) Order cost posting on ship");
  await updateOrderStatus(order!.id, "SHIPPED");
  const orderCostTx = await prisma.dealerAccountTransaction.findFirst({
    where: { orderId: order!.id, type: "ORDER_COST" },
  });
  assert(!!orderCostTx, "ORDER_COST transaction created on ship");
  assert(orderCostTx!.debit > 0, "Order cost debited");

  // 5) Statement generation
  console.log("\n5) Statement generation");
  const now = new Date();
  const stmt = await generateMonthlyStatement(dealer.id, now.getFullYear(), now.getMonth() + 1);
  assert(!!stmt.statement.id, "Monthly statement generated");
  assert(Array.isArray(stmt.lines), "Statement has lines");

  // 6) Dealer isolation
  console.log("\n6) Dealer isolation");
  if (dealer2) {
    const order2 = await createDealerOrder({
      dealerId: dealer2.id,
      items: [{ name: "Other Dealer Product", quantity: 1, salePrice: 100, costPrice: 50 }],
      _forceLegacy: true,
    });
    const dealer1Orders = await listOrders({ dealerId: dealer.id });
    const dealer2Orders = await listOrders({ dealerId: dealer2.id });
    assert(!dealer1Orders.some((o) => o.id === order2!.id), "Dealer 1 cannot see dealer 2 order");
    assert(dealer2Orders.some((o) => o.id === order2!.id), "Dealer 2 sees own order");
    const isolated = await getOrderDetail(order2!.id, dealer.id);
    assert(!isolated, "Cross-dealer order detail blocked");
    await cleanup(dealer2.id);
  } else {
    console.log("  ⚠ Second dealer not found — skipping isolation test");
  }

  // 7) Warehouse movement
  console.log("\n7) Warehouse movement");
  await recordWarehouseMovement({
    dealerId: dealer.id,
    sku: "SKU-1",
    movementType: "IN",
    quantity: 10,
    notes: "Test stok girişi",
  });
  const legacyMovements = await prisma.dealerWarehouseMovement.count({ where: { dealerId: dealer.id } });
  const coreMovements = await prisma.stockMovement.count();
  assert(legacyMovements > 0 || coreMovements > 0, "Warehouse movements recorded");

  // 8) Product Library prep field
  console.log("\n8) Product Library integration prep");
  const catalogItem = await prisma.productCatalogItem.findFirst();
  if (catalogItem) {
    const plOrder = await createDealerOrder({
      dealerId: dealer.id,
      sourceType: "PRODUCT_LIBRARY",
      items: [{
        productId: catalogItem.id,
        name: catalogItem.name,
        sku: catalogItem.sku,
        barcode: catalogItem.barcode,
        quantity: 1,
        salePrice: catalogItem.salePrice,
        costPrice: catalogItem.price,
      }],
      _forceLegacy: true,
    });
    const item = (plOrder?.items as { productId?: string }[] | undefined)?.[0];
    assert(item?.productId === catalogItem.id, "Order item links to ProductCatalogItem");
  } else {
    console.log("  ⚠ No catalog items — skipping PL link test");
  }

  // 9) THYRONIX prep field
  console.log("\n9) THYRONIX integration prep");
  const thyOrder = await createDealerOrder({
    dealerId: dealer.id,
    sourceType: "THYRONIX",
    thyronixRef: "thy-ref-001",
    items: [{ name: "THY Product", thyronixProductId: "thy-prod-1", quantity: 1, salePrice: 200, costPrice: 100 }],
    _forceLegacy: true,
  });
  assert(thyOrder?.sourceType === "THYRONIX", "THYRONIX sourceType stored");
  assert((thyOrder?.items as { thyronixProductId?: string }[])[0]?.thyronixProductId === "thy-prod-1", "thyronixProductId on item");

  // 10) Admin can list all
  console.log("\n10) Admin access");
  const allOrders = await listOrders({});
  assert(allOrders.length >= 2, "Admin list returns all orders");

  await cleanup(dealer.id);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
