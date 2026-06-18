import { reserveStockForOrder } from "@/lib/orders/order-stock-service";

export async function recordCoreWarehouseReserve(params: {
  dealerId: string;
  coreOrderId: string;
  productCatalogItemId?: string | null;
  sku?: string;
  quantity: number;
  notes?: string;
}) {
  const { isCoreWarehouseEngine } = await import("@/lib/warehouse/config");
  if (!isCoreWarehouseEngine()) {
    const { recordWarehouseMovement } = await import("@/lib/fulfillment/warehouse");
    return recordWarehouseMovement({
      dealerId: params.dealerId,
      coreOrderId: params.coreOrderId,
      productId: params.productCatalogItemId || null,
      sku: params.sku,
      movementType: "RESERVE",
      quantity: params.quantity,
      notes: params.notes || "",
    });
  }

  const { prisma } = await import("@/lib/db");
  const existing = await prisma.stockMovement.findFirst({
    where: { orderId: params.coreOrderId, type: { in: ["RESERVE", "reserve"] } },
  });
  if (existing) return existing;

  await reserveStockForOrder(params.coreOrderId);
  return prisma.stockMovement.findFirst({
    where: { orderId: params.coreOrderId, type: { in: ["RESERVE", "reserve"] } },
  });
}
