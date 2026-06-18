import { prisma } from "@/lib/db";
import type { CostType } from "./types";
import { getCostBreakdown } from "./breakdown";

export { getCostBreakdown };

const COST_TYPE_TITLES: Record<string, string> = {
  PRODUCT_COST: "Ürün Bedeli",
  SHIPPING_COST: "Kargo",
  PACKAGING_COST: "Paketleme",
  SERVICE_COST: "Ek Hizmet",
  ADJUSTMENT: "Düzeltme",
};

export async function recalculateOrderCosts(orderId: string) {
  const order = await prisma.dealerOrder.findUnique({
    where: { id: orderId },
    include: { items: true, costItems: true },
  });
  if (!order) return null;

  const productCost = order.items.reduce((s, i) => s + i.costPrice * i.quantity, 0);
  const saleTotal = order.items.reduce((s, i) => s + i.salePrice * i.quantity, 0);

  const byType: Record<string, number> = { PRODUCT_COST: productCost };
  for (const c of order.costItems) {
    if (c.type !== "PRODUCT_COST") {
      byType[c.type] = (byType[c.type] || 0) + c.amount;
    }
  }

  await prisma.dealerCostItem.deleteMany({ where: { orderId, type: "PRODUCT_COST" } });
  if (productCost > 0) {
    await prisma.dealerCostItem.create({
      data: {
        orderId,
        type: "PRODUCT_COST",
        title: COST_TYPE_TITLES.PRODUCT_COST,
        amount: productCost,
      },
    });
  }

  const totalCost = Object.values(byType).reduce((a, b) => a + b, 0);
  const totalProfit = saleTotal - totalCost;

  await prisma.dealerOrder.update({
    where: { id: orderId },
    data: { totalAmount: saleTotal, totalCost, totalProfit },
  });

  return { totalAmount: saleTotal, totalCost, totalProfit, breakdown: byType };
}

export async function addCostItem(orderId: string, type: CostType, amount: number, notes = "") {
  const title = COST_TYPE_TITLES[type] || type;
  await prisma.dealerCostItem.create({
    data: { orderId, type, title, amount, notes },
  });
  return recalculateOrderCosts(orderId);
}
