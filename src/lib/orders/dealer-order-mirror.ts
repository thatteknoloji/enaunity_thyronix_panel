import { prisma } from "@/lib/db";
import { createDealerOrder } from "@/lib/fulfillment/orders";
import { isDealerOrderMirrorEnabled, isLegacyDealerOrderEnabled } from "./config";
import type { CreateCoreOrderInput } from "./core-order-service";

type OrderWithItems = {
  id: string;
  dealerId: string | null;
  orderNumber: string;
  marketplace: string;
  marketplaceOrderId: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  thyronixRef: string;
  sourceType: string;
  items: Array<{
    productCatalogItemId: string | null;
    thyronixProductId: string;
    sku: string;
    barcode: string;
    name: string;
    quantity: number;
    price: number;
    costPrice: number;
  }>;
};

export async function mirrorToDealerOrder(order: OrderWithItems, input: CreateCoreOrderInput) {
  if (!isDealerOrderMirrorEnabled() || !order.dealerId) return null;

  const existing = await prisma.dealerOrder.findFirst({
    where: {
      dealerId: order.dealerId,
      marketplace: order.marketplace,
      marketplaceOrderId: order.marketplaceOrderId,
    },
  });
  if (existing) return existing;

  return createDealerOrder({
    dealerId: order.dealerId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerCity: order.customerCity,
    marketplace: order.marketplace,
    marketplaceOrderId: order.marketplaceOrderId,
    sourceType: order.sourceType,
    thyronixRef: order.thyronixRef,
    items: order.items.map((i) => ({
      productId: i.productCatalogItemId,
      thyronixProductId: i.thyronixProductId,
      sku: i.sku,
      barcode: i.barcode,
      name: i.name,
      quantity: i.quantity,
      salePrice: i.price,
      costPrice: i.costPrice,
    })),
    shippingCost: input.shippingCost,
    packagingCost: input.packagingCost,
    serviceCost: input.serviceCost,
    autoAccounting: false,
    initialStatus: input.fulfillmentStatus || "WAITING_FOR_PACKING",
    _forceLegacy: true,
  });
}

export function canCreateNewDealerOrder() {
  return isLegacyDealerOrderEnabled();
}
