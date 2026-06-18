import { prisma } from "../src/lib/db";

async function main() {
  const orders = await prisma.dealerOrder.findMany({
    select: { id: true, orderNumber: true, marketplace: true, marketplaceOrderId: true, dealerId: true },
  });
  let fixed = 0;
  for (const o of orders) {
    if (!o.marketplaceOrderId) {
      await prisma.dealerOrder.update({ where: { id: o.id }, data: { marketplaceOrderId: o.orderNumber } });
      fixed++;
    }
  }
  const seen = new Map<string, number>();
  for (const o of orders) {
    const mpOrderId = o.marketplaceOrderId || o.orderNumber;
    const key = `${o.dealerId}|${o.marketplace}|${mpOrderId}`;
    const count = seen.get(key) || 0;
    if (count > 0) {
      await prisma.dealerOrder.update({
        where: { id: o.id },
        data: { marketplaceOrderId: `${mpOrderId}-dup-${count}` },
      });
      fixed++;
    }
    seen.set(key, count + 1);
  }
  console.log(`Prepared ${fixed} dealer orders for unique constraint`);
}

main().finally(() => prisma.$disconnect());
