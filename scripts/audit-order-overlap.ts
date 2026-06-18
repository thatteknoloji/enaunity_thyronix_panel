/**
 * Order Convergence audit — read-only overlap report
 * Run: npm run audit:order-overlap
 */
import { prisma } from "../src/lib/db";

type OverlapRow = {
  dealerOrderId: string;
  orderNumber: string;
  marketplace: string;
  marketplaceOrderId: string;
  dealerId: string;
  issue: string;
  dealerOrderTotal?: number;
  coreOrderTotal?: number;
  dealerOrderStatus?: string;
  coreFulfillmentStatus?: string;
};

async function main() {
  console.log("\n=== Order Overlap Audit (read-only) ===\n");

  const dealerOrders = await prisma.dealerOrder.findMany({
    select: {
      id: true,
      orderNumber: true,
      dealerId: true,
      marketplace: true,
      marketplaceOrderId: true,
      totalAmount: true,
      totalCost: true,
      status: true,
    },
  });

  const coreOrders = await prisma.order.findMany({
    where: { marketplace: { not: "" } },
    select: {
      id: true,
      orderNumber: true,
      dealerId: true,
      marketplace: true,
      marketplaceOrderId: true,
      total: true,
      totalCost: true,
      fulfillmentStatus: true,
      status: true,
    },
  });

  const coreByKey = new Map<string, (typeof coreOrders)[0]>();
  for (const o of coreOrders) {
    if (!o.dealerId || !o.marketplace || !o.marketplaceOrderId) continue;
    coreByKey.set(`${o.dealerId}|${o.marketplace}|${o.marketplaceOrderId}`, o);
  }

  const issues: OverlapRow[] = [];
  const duplicateKeys = new Map<string, number>();

  for (const d of dealerOrders) {
    if (d.marketplace && d.marketplaceOrderId) {
      const key = `${d.dealerId}|${d.marketplace}|${d.marketplaceOrderId}`;
      duplicateKeys.set(key, (duplicateKeys.get(key) || 0) + 1);

      const core = coreByKey.get(key);
      if (!core) {
        issues.push({
          dealerOrderId: d.id,
          orderNumber: d.orderNumber,
          marketplace: d.marketplace,
          marketplaceOrderId: d.marketplaceOrderId,
          dealerId: d.dealerId,
          issue: "DealerOrder without Core Order counterpart",
          dealerOrderTotal: d.totalAmount,
          dealerOrderStatus: d.status,
        });
      } else {
        const amountDiff = Math.abs(d.totalAmount - core.total);
        const costDiff = Math.abs(d.totalCost - core.totalCost);
        if (amountDiff > 0.01 || costDiff > 0.01) {
          issues.push({
            dealerOrderId: d.id,
            orderNumber: d.orderNumber,
            marketplace: d.marketplace,
            marketplaceOrderId: d.marketplaceOrderId,
            dealerId: d.dealerId,
            issue: "Amount/cost mismatch between systems",
            dealerOrderTotal: d.totalAmount,
            coreOrderTotal: core.total,
            dealerOrderStatus: d.status,
            coreFulfillmentStatus: core.fulfillmentStatus,
          });
        }
        if (d.status !== core.fulfillmentStatus && core.fulfillmentStatus) {
          issues.push({
            dealerOrderId: d.id,
            orderNumber: d.orderNumber,
            marketplace: d.marketplace,
            marketplaceOrderId: d.marketplaceOrderId,
            dealerId: d.dealerId,
            issue: "Status vs fulfillmentStatus mismatch",
            dealerOrderStatus: d.status,
            coreFulfillmentStatus: core.fulfillmentStatus,
          });
        }
      }
    }
  }

  const dualSystemDuplicates = [...duplicateKeys.entries()].filter(([, c]) => c > 1);

  console.log(`DealerOrder records: ${dealerOrders.length}`);
  console.log(`Core marketplace orders: ${coreOrders.length}`);
  console.log(`DealerOrders missing Core counterpart: ${issues.filter((i) => i.issue.includes("without")).length}`);
  console.log(`Amount/cost mismatches: ${issues.filter((i) => i.issue.includes("mismatch between")).length}`);
  console.log(`Status mismatches: ${issues.filter((i) => i.issue.includes("fulfillmentStatus")).length}`);
  console.log(`Duplicate marketplace keys in DealerOrder: ${dualSystemDuplicates.length}`);

  if (issues.length > 0) {
    console.log("\nSample issues (max 20):");
    for (const row of issues.slice(0, 20)) {
      console.log(`  - [${row.issue}] ${row.orderNumber} ${row.marketplace}/${row.marketplaceOrderId}`);
    }
  } else {
    console.log("\nNo overlap issues detected.");
  }

  console.log("\nAudit complete (no data modified).\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
