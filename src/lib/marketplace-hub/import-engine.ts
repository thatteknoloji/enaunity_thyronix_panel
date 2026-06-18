import { prisma } from "@/lib/db";
import { buildConvergenceMetadata, HUB_MARKETPLACE_SOURCE } from "./config";
import { matchProductLine, defaultCosts } from "./product-match";
import { isCoreOrderEngine } from "@/lib/orders/config";
import { createCoreOrder, findCoreOrderByMarketplace } from "@/lib/orders/core-order-service";
import { buildOrderMetadata } from "@/lib/orders/config";

export type MarketplaceOrderPayload = {
  platform: string;
  platformOrderId: string;
  customerName?: string;
  customerPhone?: string;
  customerCity?: string;
  customerAddress?: string;
  totalAmount?: number;
  items: {
    productName: string;
    barcode?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    catalogItemId?: string;
    thyronixProductId?: string;
  }[];
};

export async function importMarketplaceOrderToFulfillment(params: {
  dealerId: string;
  connectionId: string;
  payload: MarketplaceOrderPayload;
  marketplaceOrderRecordId?: string;
}) {
  const { dealerId, payload } = params;
  const marketplace = payload.platform.toUpperCase();
  const marketplaceOrderId = payload.platformOrderId;

  if (!marketplaceOrderId) {
    throw new Error("marketplaceOrderId zorunlu");
  }

  if (isCoreOrderEngine()) {
    const existingCore = await findCoreOrderByMarketplace(dealerId, marketplace, marketplaceOrderId);
    if (existingCore) {
      return { order: existingCore, duplicate: true };
    }
  } else {
    const existing = await prisma.dealerOrder.findFirst({
      where: { dealerId, marketplace, marketplaceOrderId },
    });
    if (existing) {
      return { order: existing, duplicate: true };
    }
  }

  const orderItems = [];
  for (const line of payload.items) {
    let catalog = null;
    if (line.catalogItemId) {
      catalog = await prisma.productCatalogItem.findUnique({ where: { id: line.catalogItemId } });
    }
    if (!catalog) {
      const matched = await matchProductLine({
        barcode: line.barcode,
        sku: line.sku,
        name: line.productName,
      });
      if (matched.catalogItem) catalog = matched.catalogItem as any;
    }

    orderItems.push({
      productCatalogItemId: catalog?.id || null,
      thyronixProductId: line.thyronixProductId || "",
      sku: catalog?.sku || line.sku || "",
      barcode: catalog?.barcode || line.barcode || "",
      name: catalog?.name || line.productName,
      quantity: line.quantity,
      salePrice: line.unitPrice,
      costPrice: catalog?.price ?? Math.round(line.unitPrice * 0.65),
    });
  }

  const saleTotal = orderItems.reduce((s, i) => s + i.salePrice * i.quantity, 0);
  const costs = defaultCosts(saleTotal);

  let order: any;
  let duplicate = false;

  if (isCoreOrderEngine()) {
    const result = await createCoreOrder({
      dealerId,
      customerName: payload.customerName || "",
      customerPhone: payload.customerPhone || "",
      customerCity: payload.customerCity || "",
      customerAddress: payload.customerAddress,
      marketplace,
      marketplaceOrderId,
      sourceType: HUB_MARKETPLACE_SOURCE,
      thyronixRef: buildConvergenceMetadata({
        marketplaceOrderId,
        connectionId: params.connectionId,
        importedAt: new Date().toISOString(),
      }),
      metadataJson: buildOrderMetadata({
        marketplaceOrderId,
        connectionId: params.connectionId,
      }),
      items: orderItems,
      shippingCost: costs.shippingCost,
      packagingCost: costs.packagingCost,
      serviceCost: costs.serviceCost,
      autoAccounting: true,
      fulfillmentStatus: "WAITING_FOR_PACKING",
      status: "processing",
    });
    order = result.order;
    duplicate = result.duplicate;
  } else {
    const { createDealerOrder: legacyCreate } = await import("@/lib/fulfillment/orders");
    order = await legacyCreate({
      dealerId,
      customerName: payload.customerName || "",
      customerPhone: payload.customerPhone || "",
      customerCity: payload.customerCity || "",
      marketplace,
      marketplaceOrderId,
      sourceType: HUB_MARKETPLACE_SOURCE,
      thyronixRef: buildConvergenceMetadata({
        marketplaceOrderId,
        connectionId: params.connectionId,
        importedAt: new Date().toISOString(),
      }),
      items: orderItems.map((i) => ({
        productId: i.productCatalogItemId,
        thyronixProductId: i.thyronixProductId,
        sku: i.sku,
        barcode: i.barcode,
        name: i.name,
        quantity: i.quantity,
        salePrice: i.salePrice,
        costPrice: i.costPrice,
      })),
      shippingCost: costs.shippingCost,
      packagingCost: costs.packagingCost,
      serviceCost: costs.serviceCost,
      autoAccounting: true,
      initialStatus: "WAITING_FOR_PACKING",
      _forceLegacy: true,
    });

    if (params.marketplaceOrderRecordId && order) {
      await prisma.dealerShipment.create({
        data: {
          orderId: order.id,
          status: "WAITING_FOR_PACKING",
          shippingCost: costs.shippingCost,
        },
      });
    }
  }

  if (params.marketplaceOrderRecordId && order) {
    await prisma.marketplaceOrder.update({
      where: { id: params.marketplaceOrderRecordId },
      data: {
        dealerOrderId: isCoreOrderEngine() ? null : order.id,
        processed: true,
        status: "imported",
      },
    });
  }

  return { order, duplicate };
}
