import { prisma } from "@/lib/db";
import { buildConvergenceMetadata, HUB_MARKETPLACE_SOURCE } from "./config";
import { defaultCosts } from "./product-match";
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
  cargoTrackingNumber?: string;
  cargoProviderName?: string;
  totalAmount?: number;
  items: {
    productName: string;
    barcode?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string;
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

  // Pazaryeri satırları katalog eşleştirmesi olmadan ham olarak kaydedilir
  const orderItems = payload.items.map((line) => ({
    productCatalogItemId: null,
    thyronixProductId: "",
    sku: line.sku || line.barcode || "",
    barcode: line.barcode || "",
    name: line.productName,
    quantity: line.quantity,
    salePrice: line.unitPrice,
    costPrice: Math.round(line.unitPrice * 0.65),
    sourceType: "MARKETPLACE",
    metadataJson: JSON.stringify({
      imageUrl: line.imageUrl || "",
      rawProductName: line.productName,
      barcode: line.barcode || "",
      marketplace: marketplace,
    }),
  }));

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
      cargoTrackingNumber: payload.cargoTrackingNumber,
      cargoProviderName: payload.cargoProviderName,
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
        customerAddress: payload.customerAddress,
        cargoTrackingNumber: payload.cargoTrackingNumber,
        cargoProviderName: payload.cargoProviderName,
      }),
      items: orderItems,
      shippingCost: costs.shippingCost,
      packagingCost: costs.packagingCost,
      serviceCost: costs.serviceCost,
      autoAccounting: true,
      fulfillmentStatus: "NEW",
      status: "processing",
    });
    order = result.order;
    duplicate = result.duplicate;
  } else {
    const { createDealerOrder: legacyCreate } = await import("@/lib/fulfillment/orders");
    order = await legacyCreate({
      dealerId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerCity: payload.customerCity,
      marketplace,
      marketplaceOrderId,
      sourceType: HUB_MARKETPLACE_SOURCE,
      items: orderItems.map((i) => ({
        name: i.name,
        barcode: i.barcode,
        sku: i.sku,
        quantity: i.quantity,
        salePrice: i.salePrice,
        costPrice: i.costPrice,
      })),
      shippingCost: costs.shippingCost,
      packagingCost: costs.packagingCost,
      serviceCost: costs.serviceCost,
      autoAccounting: true,
      initialStatus: "NEW",
    });
  }

  if (params.marketplaceOrderRecordId) {
    await prisma.marketplaceOrder.update({
      where: { id: params.marketplaceOrderRecordId },
      data: { processed: true, dealerOrderId: order.id },
    }).catch(() => {});
  }

  return { order, duplicate };
}
