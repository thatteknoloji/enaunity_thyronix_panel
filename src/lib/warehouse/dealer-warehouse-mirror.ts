import { prisma } from "@/lib/db";
import { isDealerWarehouseMirrorEnabled } from "./config";

type MirrorParams = {
  dealerId?: string;
  orderId?: string;
  coreOrderId?: string;
  productId?: string;
  sku?: string;
  movementType: string;
  quantity: number;
  notes?: string;
  stockSnapshot?: { stock: number; reservedStock: number; availableStock: number };
};

export async function mirrorDealerWarehouseMovement(params: MirrorParams) {
  if (!isDealerWarehouseMirrorEnabled() || !params.dealerId) return null;

  const snap = params.stockSnapshot || { stock: 0, reservedStock: 0, availableStock: 0 };

  return prisma.dealerWarehouseMovement.create({
    data: {
      dealerId: params.dealerId,
      orderId: params.orderId || null,
      coreOrderId: params.coreOrderId || params.orderId || null,
      productId: null,
      sku: params.sku || "",
      location: "MAIN",
      stock: snap.stock,
      reservedStock: snap.reservedStock,
      availableStock: snap.availableStock,
      movementType: params.movementType,
      quantity: params.quantity,
      notes: `[mirror] ${params.notes || ""}`.trim(),
    },
  });
}
