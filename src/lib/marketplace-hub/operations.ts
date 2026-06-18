import { prisma } from "@/lib/db";
import { updateOrderStatus } from "@/lib/fulfillment/orders";

export async function getPickList(dealerId?: string) {
  return prisma.dealerOrder.findMany({
    where: {
      status: { in: ["WAITING_FOR_PACKING", "PROCESSING", "NEW"] },
      ...(dealerId ? { dealerId } : {}),
    },
    include: {
      items: { include: { catalogItem: { select: { name: true, sku: true } } } },
      dealer: { select: { name: true, company: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function markPacked(orderId: string) {
  return updateOrderStatus(orderId, "WAITING_FOR_SHIPMENT");
}

export async function markReadyToShip(orderId: string) {
  await prisma.dealerShipment.updateMany({
    where: { orderId },
    data: { status: "WAITING_FOR_SHIPMENT" },
  });
  return updateOrderStatus(orderId, "READY_TO_SHIP");
}

export async function bulkUpdateStatus(orderIds: string[], status: string) {
  const results = [];
  for (const id of orderIds) {
    if (status === "PACKING") results.push(await updateOrderStatus(id, "PACKING"));
    else if (status === "WAITING_FOR_SHIPMENT") results.push(await markPacked(id));
    else if (status === "READY_TO_SHIP") results.push(await markReadyToShip(id));
    else results.push(await updateOrderStatus(id, status));
  }
  return results;
}

export async function getMarketplaceReports(filters?: { marketplace?: string; dealerId?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.marketplace) where.marketplace = filters.marketplace.toUpperCase();
  if (filters?.dealerId) where.dealerId = filters.dealerId;

  const orders = await prisma.dealerOrder.findMany({
    where: {
      sourceType: { in: ["MARKETPLACE", "MARKETPLACE_HUB"] },
      ...where,
    },
  });

  const byMarketplace: Record<string, { count: number; revenue: number; cost: number; profit: number }> = {};
  for (const o of orders) {
    const key = o.marketplace || "UNKNOWN";
    if (!byMarketplace[key]) byMarketplace[key] = { count: 0, revenue: 0, cost: 0, profit: 0 };
    byMarketplace[key].count++;
    byMarketplace[key].revenue += o.totalAmount;
    byMarketplace[key].cost += o.totalCost;
    byMarketplace[key].profit += o.totalProfit;
  }

  return {
    totalOrders: orders.length,
    revenue: orders.reduce((s, o) => s + o.totalAmount, 0),
    cost: orders.reduce((s, o) => s + o.totalCost, 0),
    profit: orders.reduce((s, o) => s + o.totalProfit, 0),
    byMarketplace,
  };
}
