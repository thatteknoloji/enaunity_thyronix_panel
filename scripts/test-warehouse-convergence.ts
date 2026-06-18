/**
 * Warehouse Convergence Sprint tests
 * Run: npm run test:warehouse-convergence
 */
import { prisma } from "../src/lib/db";
import { execSync } from "child_process";
import {
  getDefaultWarehouse,
  ensureProductWarehouse,
  reserveStockForOrderLines,
  releaseReservation,
  commitStockOut,
  returnStock,
  syncProductStock,
  getAvailableStock,
  createStockMovement,
} from "../src/lib/warehouse/warehouse-service";
import { reserveStockForOrder } from "../src/lib/orders/order-stock-service";
import { findProductByCatalogItem, resolveStockProductForOrderItem } from "../src/lib/products/product-identity";
import { isCoreWarehouseEngine } from "../src/lib/warehouse/config";

process.env.WAREHOUSE_ENGINE = "core";
process.env.LEGACY_DEALER_WAREHOUSE_ENABLED = "false";
process.env.DEALER_WAREHOUSE_MIRROR_ENABLED = "false";
process.env.ORDER_ENGINE = "core";

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

const TEST_PREFIX = "whc-test-";

async function cleanup() {
  const orders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: "ENA-" } },
    select: { id: true },
  });
  for (const o of orders) {
    await prisma.stockMovement.deleteMany({ where: { orderId: o.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: o.id } });
  }
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: "ENA-" } } });
  await prisma.dealerWarehouseMovement.deleteMany({ where: { notes: { contains: TEST_PREFIX } } });
}

async function ensureTestProduct() {
  let product = await prisma.product.findFirst({ where: { sku: `${TEST_PREFIX}sku` } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        name: `${TEST_PREFIX} Product`,
        slug: `${TEST_PREFIX}-product`,
        description: "test",
        price: 100,
        sku: `${TEST_PREFIX}sku`,
        barcode: `${TEST_PREFIX}barcode`,
        stock: 0,
      },
    });
  }
  return product;
}

async function ensureTestUser() {
  const user = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!user) throw new Error("Admin user required");
  return user;
}

async function main() {
  console.log("\n=== Warehouse Convergence Tests ===\n");
  assert(isCoreWarehouseEngine(), "WAREHOUSE_ENGINE=core active");

  await cleanup();
  const product = await ensureTestProduct();
  const user = await ensureTestUser();
  const dealer = await prisma.dealer.findFirst({ where: { status: "active" } });
  if (!dealer) throw new Error("Active dealer required");

  console.log("1) getDefaultWarehouse");
  const warehouse = await getDefaultWarehouse();
  assert(!!warehouse.id, "getDefaultWarehouse works");

  console.log("\n2) ensureProductWarehouse");
  const pw = await ensureProductWarehouse(product.id, warehouse.id);
  assert(!!pw.id, "ProductWarehouse created");
  await prisma.productWarehouse.update({ where: { id: pw.id }, data: { stock: 50 } });
  await syncProductStock(product.id);

  console.log("\n3) reserveStockForOrderLines");
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      dealerId: dealer.id,
      total: 200,
      address: "Test",
      orderNumber: `ENA-${TEST_PREFIX}${Date.now()}`,
      fulfillmentStatus: "WAITING_FOR_PACKING",
      items: {
        create: [{
          productId: product.id,
          name: product.name,
          quantity: 5,
          price: 40,
          sku: product.sku,
        }],
      },
    },
    include: { items: true },
  });

  const reserve1 = await reserveStockForOrderLines({
    orderId: order.id,
    dealerId: dealer.id,
    items: [{ orderItemId: order.items[0].id, productId: product.id, quantity: 5, sku: product.sku }],
  });
  assert(!reserve1.alreadyReserved, "First reserve applied");
  const reserveMovement = await prisma.stockMovement.findFirst({
    where: { orderId: order.id, type: "RESERVE" },
  });
  assert(!!reserveMovement, "StockMovement RESERVE written");

  console.log("\n4) Duplicate reserve blocked");
  const reserve2 = await reserveStockForOrderLines({
    orderId: order.id,
    dealerId: dealer.id,
    items: [{ orderItemId: order.items[0].id, productId: product.id, quantity: 5 }],
  });
  assert(reserve2.alreadyReserved === true, "Second reserve blocked");

  console.log("\n5) releaseReservation");
  await releaseReservation({
    orderId: order.id,
    productId: product.id,
    quantity: 5,
    dealerId: dealer.id,
  });
  const release = await prisma.stockMovement.findFirst({
    where: { orderId: order.id, type: "RELEASE_RESERVE" },
  });
  assert(!!release, "RELEASE_RESERVE written");

  console.log("\n6) commitStockOut");
  await createStockMovement({
    productId: product.id,
    type: "RESERVE",
    quantity: 3,
    orderId: order.id,
    dealerId: dealer.id,
  });
  await commitStockOut({
    orderId: order.id,
    productId: product.id,
    quantity: 3,
    dealerId: dealer.id,
  });
  const out = await prisma.stockMovement.findFirst({
    where: { orderId: order.id, type: "OUT" },
  });
  assert(!!out, "OUT movement written");

  console.log("\n7) returnStock");
  await returnStock({
    orderId: order.id,
    productId: product.id,
    quantity: 1,
    dealerId: dealer.id,
  });
  const ret = await prisma.stockMovement.findFirst({
    where: { orderId: order.id, type: "RETURN" },
  });
  assert(!!ret, "RETURN movement written");

  console.log("\n8) syncProductStock");
  const synced = await syncProductStock(product.id);
  const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
  assert(updatedProduct!.stock === synced, "Product.stock synced");

  console.log("\n9) ProductCatalogItem barcode match");
  let catalog = await prisma.productCatalogItem.findFirst({ where: { barcode: product.barcode } });
  if (!catalog) {
    let cat = await prisma.productCatalog.findFirst();
    if (!cat) {
      cat = await prisma.productCatalog.create({
        data: { name: "Test Catalog", slug: `${TEST_PREFIX}catalog` },
      });
    }
    catalog = await prisma.productCatalogItem.create({
      data: {
        catalogId: cat.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        salePrice: 100,
        price: 60,
      },
    });
  }
  const matched = await findProductByCatalogItem(catalog.id);
  assert(matched?.id === product.id, "ProductCatalogItem maps to Product via barcode/sku");

  console.log("\n10) Unmatched item does not crash order reserve");
  const unmatchedOrder = await prisma.order.create({
    data: {
      userId: user.id,
      dealerId: dealer.id,
      total: 50,
      address: "Test",
      orderNumber: `ENA-${TEST_PREFIX}unm-${Date.now()}`,
      fulfillmentStatus: "WAITING_FOR_PACKING",
      items: {
        create: [{
          name: "Unknown Product XYZ",
          quantity: 1,
          price: 50,
          sku: "UNKNOWN-SKU-99999",
        }],
      },
    },
  });
  const unmatchedResult = await reserveStockForOrder(unmatchedOrder.id);
  assert(!!unmatchedResult, "Unmatched order reserve completes");
  assert((unmatchedResult?.warnings?.length || 0) > 0, "Unmatched order produces warning");

  console.log("\n11) DealerWarehouseMovement default off");
  const legacyCount = await prisma.dealerWarehouseMovement.count({
    where: { coreOrderId: order.id },
  });
  assert(legacyCount === 0, "DealerWarehouseMovement not written by default");

  console.log("\n12) Mirror flag");
  process.env.DEALER_WAREHOUSE_MIRROR_ENABLED = "true";
  await createStockMovement({
    productId: product.id,
    type: "ADJUSTMENT",
    quantity: 1,
    note: `${TEST_PREFIX} mirror test`,
    dealerId: dealer.id,
  });
  const mirrored = await prisma.dealerWarehouseMovement.findFirst({
    where: { notes: { contains: TEST_PREFIX } },
  });
  assert(!!mirrored, "Mirror writes legacy movement when enabled");
  process.env.DEALER_WAREHOUSE_MIRROR_ENABLED = "false";

  console.log("\n13) resolveStockProductForOrderItem");
  const resolved = await resolveStockProductForOrderItem({
    productCatalogItemId: catalog.id,
    sku: catalog.sku,
    barcode: catalog.barcode,
    name: catalog.name,
  });
  assert(resolved.productId === product.id, "resolveStockProductForOrderItem works");

  console.log("\n14) Audit script");
  try {
    execSync("npx tsx scripts/audit-warehouse-overlap.ts", { stdio: "pipe" });
    assert(true, "audit:warehouse-overlap runs");
  } catch {
    assert(false, "audit:warehouse-overlap runs");
  }

  await cleanup();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
