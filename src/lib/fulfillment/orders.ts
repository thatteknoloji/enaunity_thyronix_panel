import { prisma } from "@/lib/db";
import { generateOrderNumber, type CreateOrderInput } from "./types";
import { addCostItem, recalculateOrderCosts } from "./costs";
import { postOrderCostToAccount } from "./accounts";
import { recordWarehouseMovement } from "./warehouse";
import { isCoreOrderEngine } from "@/lib/orders/config";
import { createCoreOrderFromLegacyInput } from "@/lib/orders/core-order-service";
import { getCoreOrderDetail, listCoreOrders, updateCoreFulfillmentStatus } from "@/lib/orders/core-order-service";
import { coreOrderToUnified, dealerOrderToUnified } from "@/lib/orders/compat-adapter";

async function createLegacyDealerOrder(input: CreateOrderInput) {
  const orderNumber = generateOrderNumber();
  const marketplaceOrderId = input.marketplaceOrderId || (input.marketplace ? "" : orderNumber);
  const items = input.items.map((item) => {
    const costPrice = item.costPrice ?? 0;
    const profit = (item.salePrice - costPrice) * item.quantity;
    return {
      productId: item.productId || null,
      thyronixProductId: item.thyronixProductId || "",
      sku: item.sku || "",
      barcode: item.barcode || "",
      name: item.name,
      quantity: item.quantity,
      salePrice: item.salePrice,
      costPrice,
      profitAmount: profit,
    };
  });

  const order = await prisma.dealerOrder.create({
    data: {
      orderNumber,
      dealerId: input.dealerId,
      customerName: input.customerName || "",
      customerPhone: input.customerPhone || "",
      customerCity: input.customerCity || "",
      marketplace: input.marketplace || "",
      marketplaceOrderId,
      sourceType: input.sourceType || "MANUAL",
      thyronixRef: input.thyronixRef || "",
      status: input.initialStatus || "NEW",
      items: { create: items },
    },
    include: { items: true },
  });

  if (input.shippingCost) await addCostItem(order.id, "SHIPPING_COST", input.shippingCost);
  if (input.packagingCost) await addCostItem(order.id, "PACKAGING_COST", input.packagingCost);
  if (input.serviceCost) await addCostItem(order.id, "SERVICE_COST", input.serviceCost);

  await recalculateOrderCosts(order.id);

  if (input.autoAccounting) {
    await postOrderCostToAccount(input.dealerId, order.id);
  }

  for (const item of order.items) {
    if (item.productId) {
      await recordWarehouseMovement({
        dealerId: input.dealerId,
        orderId: order.id,
        productId: item.productId,
        sku: item.sku,
        movementType: "RESERVE",
        quantity: item.quantity,
        notes: `Sipariş rezervasyonu ${orderNumber}`,
      });
    }
  }

  return prisma.dealerOrder.findUnique({
    where: { id: order.id },
    include: { items: true, costItems: true, shipments: true },
  });
}

export async function createDealerOrder(input: CreateOrderInput) {
  if (isCoreOrderEngine() && !input._forceLegacy) {
    const result = await createCoreOrderFromLegacyInput(input);
    return coreOrderToUnified(result.order as any);
  }
  return createLegacyDealerOrder(input);
}

export async function updateOrderStatus(orderId: string, status: string) {
  const coreOrder = await prisma.order.findUnique({ where: { id: orderId } });
  if (coreOrder) {
    return updateCoreFulfillmentStatus(orderId, status);
  }

  const order = await prisma.dealerOrder.update({
    where: { id: orderId },
    data: { status },
    include: { items: true },
  });

  if (status === "SHIPPED") {
    await postOrderCostToAccount(order.dealerId, orderId);
    for (const item of order.items) {
      if (item.productId) {
        await recordWarehouseMovement({
          dealerId: order.dealerId,
          orderId,
          productId: item.productId,
          sku: item.sku,
          movementType: "OUT",
          quantity: item.quantity,
          notes: `Sevkiyat ${order.orderNumber}`,
        });
      }
    }
  }

  if (status === "RETURNED") {
    for (const item of order.items) {
      if (item.productId) {
        await recordWarehouseMovement({
          dealerId: order.dealerId,
          orderId,
          productId: item.productId,
          sku: item.sku,
          movementType: "RETURN",
          quantity: item.quantity,
          notes: `İade ${order.orderNumber}`,
        });
      }
    }
  }

  return order;
}

export async function getOrderDetail(orderId: string, dealerId?: string) {
  const core = await getCoreOrderDetail(orderId, dealerId);
  if (core) return coreOrderToUnified(core as any);

  const legacy = await prisma.dealerOrder.findFirst({
    where: { id: orderId, ...(dealerId ? { dealerId } : {}) },
    include: {
      items: { include: { catalogItem: { select: { id: true, name: true, brand: true } } } },
      costItems: true,
      shipments: true,
      dealer: { select: { id: true, name: true, company: true } },
    },
  });
  if (legacy) return dealerOrderToUnified(legacy);
  return null;
}

export async function listOrders(filters: { dealerId?: string; status?: string; fulfillmentStatus?: string; sourceType?: string; limit?: number; includeLegacy?: boolean }) {
  if (isCoreOrderEngine()) {
    const coreOrders = await listCoreOrders({
      dealerId: filters.dealerId,
      status: filters.status,
      fulfillmentStatus: filters.fulfillmentStatus || filters.status,
      sourceType: filters.sourceType,
      limit: filters.limit,
    });

    const unified = coreOrders.map(coreOrderToUnified);

    if (filters.includeLegacy !== false) {
      const legacyOrders = await prisma.dealerOrder.findMany({
        where: {
          ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
        },
        include: {
          items: true,
          shipments: true,
          dealer: { select: { id: true, name: true, company: true } },
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit || 100,
      });

      const coreKeys = new Set(
        coreOrders
          .filter((o) => o.marketplace && o.marketplaceOrderId)
          .map((o) => `${o.dealerId}|${o.marketplace}|${o.marketplaceOrderId}`)
      );

      for (const lo of legacyOrders) {
        const key = `${lo.dealerId}|${lo.marketplace}|${lo.marketplaceOrderId}`;
        if (lo.marketplace && lo.marketplaceOrderId && coreKeys.has(key)) continue;
        unified.push(dealerOrderToUnified(lo));
      }

      unified.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return unified.slice(0, filters.limit || 200);
  }

  const legacy = await prisma.dealerOrder.findMany({
    where: {
      ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: {
      items: true,
      shipments: true,
      dealer: { select: { id: true, name: true, company: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit || 100,
  });

  return legacy.map(dealerOrderToUnified);
}
