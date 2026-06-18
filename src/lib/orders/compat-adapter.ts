import type { Order as CoreOrder, DealerOrder } from "@prisma/client";

export type UnifiedOrderView = {
  id: string;
  orderNumber: string;
  dealerId: string | null;
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  status: string;
  fulfillmentStatus: string;
  sourceType: string;
  marketplace: string;
  marketplaceOrderId: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  createdAt: Date;
  engine: "core" | "legacy_dealer_order";
  items: unknown[];
  shipments?: unknown[];
  dealer?: unknown;
  costItems?: unknown[];
};

export function coreOrderToUnified(order: CoreOrder & { items?: unknown[]; shipments?: unknown[]; dealer?: unknown; costItems?: unknown[] }): UnifiedOrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber || order.id.slice(0, 8),
    dealerId: order.dealerId,
    totalAmount: order.total,
    totalCost: order.totalCost,
    totalProfit: order.totalProfit,
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus || order.status,
    sourceType: order.sourceType,
    marketplace: order.marketplace,
    marketplaceOrderId: order.marketplaceOrderId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerCity: order.customerCity,
    createdAt: order.createdAt,
    engine: "core",
    items: order.items || [],
    shipments: order.shipments,
    dealer: order.dealer,
    costItems: order.costItems,
  };
}

export function dealerOrderToUnified(order: DealerOrder & { items?: unknown[]; shipments?: unknown[]; dealer?: unknown; costItems?: unknown[] }): UnifiedOrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    dealerId: order.dealerId,
    totalAmount: order.totalAmount,
    totalCost: order.totalCost,
    totalProfit: order.totalProfit,
    status: order.status,
    fulfillmentStatus: order.status,
    sourceType: order.sourceType,
    marketplace: order.marketplace,
    marketplaceOrderId: order.marketplaceOrderId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerCity: order.customerCity,
    createdAt: order.createdAt,
    engine: "legacy_dealer_order",
    items: order.items || [],
    shipments: order.shipments,
    dealer: order.dealer,
    costItems: order.costItems,
  };
}
