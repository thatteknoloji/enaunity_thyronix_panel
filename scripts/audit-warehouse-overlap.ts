/**
 * Warehouse Convergence audit — read-only
 * Run: npm run audit:warehouse-overlap
 */
import { prisma } from "../src/lib/db";
import { getAvailableStock } from "../src/lib/warehouse/warehouse-service";
import { RESERVE_TYPES } from "../src/lib/warehouse/config";

async function main() {
  console.log("\n=== Warehouse Overlap Audit (read-only) ===\n");

  let productStockMismatches = 0;
  let negativeRisk = 0;
  let unmatchedCatalog = 0;
  let ordersWithoutReserve = 0;
  let legacyVsCoreGap = 0;

  const products = await prisma.product.findMany({ select: { id: true, name: true, stock: true }, take: 300 });
  for (const p of products) {
    const agg = await prisma.productWarehouse.aggregate({
      where: { productId: p.id },
      _sum: { stock: true },
    });
    const whTotal = agg._sum.stock || 0;
    if (whTotal !== p.stock) {
      productStockMismatches++;
      if (productStockMismatches <= 5) {
        console.log(`  • Product.stock mismatch: ${p.name} (product=${p.stock}, warehouse=${whTotal})`);
      }
    }
    const avail = await getAvailableStock(p.id);
    if (avail.availableStock < 0) {
      negativeRisk++;
      console.log(`  • Negative available stock: ${p.name}`);
    }
  }

  const coreOrders = await prisma.order.findMany({
    where: { fulfillmentStatus: { in: ["WAITING_FOR_PACKING", "PROCESSING", "NEW"] } },
    select: { id: true, orderNumber: true },
    take: 100,
  });
  for (const o of coreOrders) {
    const reserve = await prisma.stockMovement.findFirst({
      where: { orderId: o.id, type: { in: [...RESERVE_TYPES, "RESERVE"] } },
    });
    if (!reserve) {
      ordersWithoutReserve++;
      if (ordersWithoutReserve <= 5) {
        console.log(`  • Core order without RESERVE: ${o.orderNumber || o.id.slice(0, 8)}`);
      }
    }
  }

  const unmatchedItems = await prisma.orderItem.findMany({
    where: { productId: null, productCatalogItemId: { not: null } },
    select: { id: true, name: true, productCatalogItemId: true },
    take: 50,
  });
  for (const item of unmatchedItems) {
    const catalog = item.productCatalogItemId
      ? await prisma.productCatalogItem.findUnique({ where: { id: item.productCatalogItemId } })
      : null;
    if (!catalog) {
      unmatchedCatalog++;
      continue;
    }
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          ...(catalog.barcode ? [{ barcode: catalog.barcode }] : []),
          ...(catalog.sku ? [{ sku: catalog.sku }] : []),
        ],
      },
    });
    if (!product) {
      unmatchedCatalog++;
      if (unmatchedCatalog <= 5) {
        console.log(`  • Unmatched catalog item on order line: ${item.name || item.id}`);
      }
    }
  }

  const dealerMovements = await prisma.dealerWarehouseMovement.count();
  const coreMovements = await prisma.stockMovement.count();
  if (dealerMovements > 0 && coreMovements === 0) {
    legacyVsCoreGap = dealerMovements;
    console.log(`  • Legacy DealerWarehouseMovement exists (${dealerMovements}) but no Core StockMovement`);
  }

  console.log("\nSummary:");
  console.log(`  Product.stock vs ProductWarehouse mismatches: ${productStockMismatches}`);
  console.log(`  Negative available stock risks: ${negativeRisk}`);
  console.log(`  Core orders missing reserve: ${ordersWithoutReserve}`);
  console.log(`  Unmatched catalog order items: ${unmatchedCatalog}`);
  console.log(`  Legacy-only movement gap: ${legacyVsCoreGap}`);
  console.log(`  DealerWarehouseMovement records: ${dealerMovements}`);
  console.log(`  StockMovement records: ${coreMovements}`);
  console.log("\nAudit complete (no data modified).\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
