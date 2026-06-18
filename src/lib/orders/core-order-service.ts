import { prisma } from "@/lib/db";
import { generateOrderNumber, type CreateOrderInput } from "@/lib/fulfillment/types";
import { defaultCosts } from "@/lib/marketplace-hub/product-match";
import { buildOrderMetadata, isCoreOrderEngine } from "./config";
import { addCoreCostItem, recalculateCoreOrderCosts } from "./cost-service";
import { postCoreOrderCostToAccount } from "./accounting-bridge";
import { mirrorToDealerOrder } from "./dealer-order-mirror";

export type CoreOrderItemInput = {
  productId?: string | null;
  productCatalogItemId?: string | null;
  thyronixProductId?: string;
  sku?: string;
  barcode?: string;
  name: string;
  quantity: number;
  salePrice: number;
  costPrice?: number;
  sourceType?: string;
};

export type CreateCoreOrderInput = {
  dealerId: string;
  userId?: string;
  customerName?: string;
  customerPhone?: string;
  customerCity?: string;
  customerAddress?: string;
  marketplace?: string;
  marketplaceOrderId?: string;
  sourceType?: string;
  thyronixRef?: string;
  metadataJson?: string;
  items: CoreOrderItemInput[];
  shippingCost?: number;
  packagingCost?: number;
  serviceCost?: number;
  autoAccounting?: boolean;
  fulfillmentStatus?: string;
  status?: string;
};

async function resolveDealerUserId(dealerId: string): Promise<string> {
  const user = await prisma.user.findFirst({ where: { dealerId } });
  if (user) return user.id;
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (admin) return admin.id;
  const anyUser = await prisma.user.findFirst();
  if (!anyUser) throw new Error("Sipariş için kullanıcı bulunamadı");
  return anyUser.id;
}

export async function findCoreOrderByMarketplace(
  dealerId: string,
  marketplace: string,
  marketplaceOrderId: string
) {
  return prisma.order.findFirst({
    where: { dealerId, marketplace, marketplaceOrderId },
    include: { items: true, costItems: true, shipments: true },
  });
}

export async function createCoreOrder(input: CreateCoreOrderInput) {
  const orderNumber = generateOrderNumber();
  const marketplace = (input.marketplace || "").toUpperCase();
  const marketplaceOrderId = input.marketplaceOrderId || orderNumber;
  const userId = input.userId || (await resolveDealerUserId(input.dealerId));

  if (marketplace && marketplaceOrderId) {
    const dup = await findCoreOrderByMarketplace(input.dealerId, marketplace, marketplaceOrderId);
    if (dup) return { order: dup, duplicate: true as const };
  }

  const itemRows = input.items.map((item) => {
    const costPrice = item.costPrice ?? 0;
    const profit = (item.salePrice - costPrice) * item.quantity;
    return {
      productId: item.productId || null,
      productCatalogItemId: item.productCatalogItemId || null,
      name: item.name,
      quantity: item.quantity,
      price: item.salePrice,
      sku: item.sku || "",
      barcode: item.barcode || "",
      costPrice,
      profitAmount: profit,
      thyronixProductId: item.thyronixProductId || "",
      sourceType: item.sourceType || input.sourceType || "MARKETPLACE",
      metadataJson: "{}",
    };
  });

  const saleTotal = itemRows.reduce((s, i) => s + i.price * i.quantity, 0);
  const address =
    input.customerAddress ||
    [input.customerName, input.customerCity].filter(Boolean).join(", ") ||
    "Marketplace siparişi";

  const order = await prisma.order.create({
    data: {
      userId,
      dealerId: input.dealerId,
      total: saleTotal,
      address,
      status: input.status || "processing",
      orderNumber,
      marketplace,
      marketplaceOrderId,
      sourceType: input.sourceType || "MARKETPLACE",
      thyronixRef: input.thyronixRef || buildOrderMetadata(),
      metadataJson: input.metadataJson || buildOrderMetadata(),
      fulfillmentStatus: input.fulfillmentStatus || "WAITING_FOR_PACKING",
      customerName: input.customerName || "",
      customerPhone: input.customerPhone || "",
      customerCity: input.customerCity || "",
      items: { create: itemRows },
      statusHistory: {
        create: {
          status: input.status || "processing",
          note: `Fulfillment: ${input.fulfillmentStatus || "WAITING_FOR_PACKING"}`,
          changedBy: "system",
        },
      },
    },
    include: { items: true },
  });

  if (input.shippingCost) await addCoreCostItem(order.id, "SHIPPING_COST", input.shippingCost);
  if (input.packagingCost) await addCoreCostItem(order.id, "PACKAGING_COST", input.packagingCost);
  if (input.serviceCost) await addCoreCostItem(order.id, "SERVICE_COST", input.serviceCost);

  await recalculateCoreOrderCosts(order.id);

  if (input.autoAccounting !== false) {
    await postCoreOrderCostToAccount(input.dealerId, order.id);
  }

  const { reserveStockForOrder: applyOrderStock } = await import("@/lib/orders/order-stock-service");
  await applyOrderStock(order.id);

  await prisma.dealerShipment.create({
    data: {
      coreOrderId: order.id,
      status: "WAITING_FOR_PACKING",
      shippingCost: input.shippingCost || 0,
    },
  });

  const full = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true, costItems: true, shipments: true },
  });

  await mirrorToDealerOrder(full!, input);

  const { maybeCreateInvoiceForOrder } = await import("@/lib/invoices/order-invoice-bridge");
  await maybeCreateInvoiceForOrder(order.id);

  return { order: full!, duplicate: false as const };
}

export async function createCoreOrderFromLegacyInput(input: CreateOrderInput) {
  return createCoreOrder({
    dealerId: input.dealerId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerCity: input.customerCity,
    marketplace: input.marketplace,
    marketplaceOrderId: input.marketplaceOrderId,
    sourceType: input.sourceType,
    thyronixRef: input.thyronixRef,
    items: input.items.map((i) => ({
      productCatalogItemId: i.productId,
      thyronixProductId: i.thyronixProductId,
      sku: i.sku,
      barcode: i.barcode,
      name: i.name,
      quantity: i.quantity,
      salePrice: i.salePrice,
      costPrice: i.costPrice,
    })),
    shippingCost: input.shippingCost,
    packagingCost: input.packagingCost,
    serviceCost: input.serviceCost,
    autoAccounting: input.autoAccounting,
    fulfillmentStatus: input.initialStatus || "WAITING_FOR_PACKING",
  });
}

export async function updateCoreFulfillmentStatus(orderId: string, fulfillmentStatus: string) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { fulfillmentStatus },
    include: { items: true },
  });

  if (fulfillmentStatus === "SHIPPED" && order.dealerId) {
    await postCoreOrderCostToAccount(order.dealerId, orderId);
    const { commitOrderStockOut } = await import("@/lib/orders/order-stock-service");
    await commitOrderStockOut(orderId, order.dealerId);
  }

  if (fulfillmentStatus === "CANCELLED" || fulfillmentStatus === "RETURNED") {
    const { releaseOrderReservations, returnOrderStock } = await import("@/lib/orders/order-stock-service");
    if (fulfillmentStatus === "CANCELLED") {
      await releaseOrderReservations(orderId, order.dealerId || undefined);
    } else {
      await returnOrderStock(orderId, order.dealerId || undefined);
    }
  }

  const { onFulfillmentStatusChanged } = await import("@/lib/invoices/order-invoice-bridge");
  await onFulfillmentStatusChanged(orderId, fulfillmentStatus);

  return order;
}

export async function getCoreOrderDetail(orderId: string, dealerId?: string) {
  return prisma.order.findFirst({
    where: { id: orderId, ...(dealerId ? { dealerId } : {}) },
    include: {
      items: { include: { product: true, productCatalogItem: { select: { id: true, name: true, brand: true } } } },
      costItems: true,
      shipments: true,
      dealer: { select: { id: true, name: true, company: true } },
      user: { select: { name: true, email: true } },
    },
  });
}

export type ListCoreOrdersFilters = {
  dealerId?: string;
  status?: string;
  fulfillmentStatus?: string;
  sourceType?: string;
  marketplace?: string;
  limit?: number;
};

export async function listCoreOrders(filters: ListCoreOrdersFilters) {
  const where: Record<string, unknown> = {};
  if (filters.dealerId) where.dealerId = filters.dealerId;
  if (filters.status) where.status = filters.status;
  if (filters.fulfillmentStatus) where.fulfillmentStatus = filters.fulfillmentStatus;
  if (filters.sourceType) where.sourceType = filters.sourceType;
  if (filters.marketplace) where.marketplace = filters.marketplace.toUpperCase();

  return prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true, productCatalogItem: true } },
      shipments: true,
      dealer: { select: { id: true, name: true, company: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit || 100,
  });
}

export function shouldUseCoreOrderEngine() {
  return isCoreOrderEngine();
}
