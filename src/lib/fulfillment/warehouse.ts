import { prisma } from "@/lib/db";
import type { WarehouseMovementType } from "./types";
import { isCoreWarehouseEngine } from "@/lib/warehouse/config";
import {
  getAvailableStock,
  createStockMovement,
  listCoreStockMovements,
  mapMovementToLegacyView,
  adjustStock,
  commitStockOut,
  releaseReservation,
  returnStock,
} from "@/lib/warehouse/warehouse-service";
import { resolveStockProductForOrderItem } from "@/lib/products/product-identity";

async function legacyGetWarehouseStock(dealerId: string, sku: string, location = "MAIN") {
  const movements = await prisma.dealerWarehouseMovement.findMany({
    where: { dealerId, sku, location },
    orderBy: { createdAt: "asc" },
  });

  let stock = 0;
  let reserved = 0;
  for (const m of movements) {
    switch (m.movementType) {
      case "IN":
      case "RETURN":
        stock += m.quantity;
        break;
      case "OUT":
        stock -= m.quantity;
        reserved = Math.max(0, reserved - m.quantity);
        break;
      case "RESERVE":
        reserved += m.quantity;
        break;
      case "ADJUSTMENT":
        stock += m.quantity;
        break;
    }
  }

  return {
    location,
    sku,
    stock,
    reservedStock: reserved,
    availableStock: Math.max(0, stock - reserved),
    engine: "legacy_dealer_warehouse" as const,
  };
}

async function legacyRecordWarehouseMovement(params: {
  dealerId: string;
  orderId?: string;
  productId?: string | null;
  sku?: string;
  location?: string;
  movementType: WarehouseMovementType | string;
  quantity: number;
  notes?: string;
  coreOrderId?: string;
}) {
  const location = params.location || "MAIN";
  const sku = params.sku || "";
  const current = sku
    ? await legacyGetWarehouseStock(params.dealerId, sku, location)
    : { stock: 0, reservedStock: 0, availableStock: 0 };

  let stock = current.stock;
  let reserved = current.reservedStock;
  const q = params.quantity;

  switch (params.movementType) {
    case "IN":
    case "RETURN":
      stock += q;
      break;
    case "OUT":
      stock -= q;
      reserved = Math.max(0, reserved - q);
      break;
    case "RESERVE":
      reserved += q;
      break;
    case "ADJUSTMENT":
      stock += q;
      break;
  }

  return prisma.dealerWarehouseMovement.create({
    data: {
      dealerId: params.dealerId,
      orderId: params.orderId || null,
      coreOrderId: params.coreOrderId || null,
      productId: params.productId || null,
      sku,
      location,
      stock,
      reservedStock: reserved,
      availableStock: Math.max(0, stock - reserved),
      movementType: params.movementType,
      quantity: q,
      notes: params.notes || "",
    },
  });
}

export async function getWarehouseStock(dealerId: string, sku: string, location = "MAIN") {
  if (isCoreWarehouseEngine()) {
    const product = await prisma.product.findFirst({
      where: { OR: [{ sku }, { barcode: sku }] },
    });
    if (!product) {
      return { location, sku, stock: 0, reservedStock: 0, availableStock: 0, engine: "core" as const };
    }
    const avail = await getAvailableStock(product.id);
    return { ...avail, location, sku, engine: "core" as const };
  }
  return legacyGetWarehouseStock(dealerId, sku, location);
}

export async function reserveStock(params: {
  dealerId: string;
  orderId?: string;
  coreOrderId?: string;
  productId?: string;
  productCatalogItemId?: string | null;
  sku?: string;
  barcode?: string;
  name?: string;
  quantity: number;
  notes?: string;
}) {
  if (!isCoreWarehouseEngine()) {
    return legacyRecordWarehouseMovement({
      dealerId: params.dealerId,
      orderId: params.orderId,
      coreOrderId: params.coreOrderId,
      productId: params.productCatalogItemId,
      sku: params.sku,
      movementType: "RESERVE",
      quantity: params.quantity,
      notes: params.notes,
    });
  }

  const resolved = await resolveStockProductForOrderItem({
    productId: params.productId,
    productCatalogItemId: params.productCatalogItemId,
    sku: params.sku,
    barcode: params.barcode,
    name: params.name,
  });
  if (!resolved.productId) return null;

  return createStockMovement({
    productId: resolved.productId,
    type: "RESERVE",
    quantity: params.quantity,
    note: params.notes,
    orderId: params.coreOrderId || params.orderId,
    dealerId: params.dealerId,
    sku: params.sku,
    coreOrderId: params.coreOrderId || params.orderId,
  });
}

export async function releaseStock(params: {
  orderId: string;
  productId: string;
  quantity: number;
  dealerId?: string;
  sku?: string;
  note?: string;
}) {
  if (!isCoreWarehouseEngine()) {
    return legacyRecordWarehouseMovement({
      dealerId: params.dealerId || "",
      orderId: params.orderId,
      sku: params.sku,
      movementType: "RELEASE_RESERVE",
      quantity: params.quantity,
      notes: params.note,
      coreOrderId: params.orderId,
    });
  }
  return releaseReservation(params);
}

export async function createWarehouseMovement(params: {
  dealerId: string;
  orderId?: string;
  coreOrderId?: string;
  productId?: string;
  productCatalogItemId?: string | null;
  sku?: string;
  barcode?: string;
  name?: string;
  location?: string;
  movementType: WarehouseMovementType | string;
  quantity: number;
  notes?: string;
}) {
  if (!isCoreWarehouseEngine()) {
    return legacyRecordWarehouseMovement(params);
  }

  const resolved = await resolveStockProductForOrderItem({
    productId: params.productId,
    productCatalogItemId: params.productCatalogItemId,
    sku: params.sku,
    barcode: params.barcode,
    name: params.name,
  });
  if (!resolved.productId) return null;

  const orderId = params.coreOrderId || params.orderId;
  const type = params.movementType;

  if (type === "OUT") {
    return commitStockOut({
      orderId: orderId!,
      productId: resolved.productId,
      quantity: params.quantity,
      dealerId: params.dealerId,
      sku: params.sku,
      note: params.notes,
    });
  }
  if (type === "RETURN") {
    return returnStock({
      orderId,
      productId: resolved.productId,
      quantity: params.quantity,
      dealerId: params.dealerId,
      sku: params.sku,
      note: params.notes,
    });
  }
  if (type === "ADJUSTMENT") {
    return adjustStock({
      productId: resolved.productId,
      quantity: params.quantity,
      note: params.notes,
      orderId,
      dealerId: params.dealerId,
    });
  }

  return createStockMovement({
    productId: resolved.productId,
    type,
    quantity: params.quantity,
    note: params.notes,
    orderId,
    dealerId: params.dealerId,
    sku: params.sku,
    coreOrderId: orderId,
  });
}

export async function recordWarehouseMovement(params: {
  dealerId: string;
  orderId?: string;
  productId?: string | null;
  sku?: string;
  location?: string;
  movementType: WarehouseMovementType | string;
  quantity: number;
  notes?: string;
  coreOrderId?: string;
}) {
  return createWarehouseMovement({
    dealerId: params.dealerId,
    orderId: params.orderId,
    coreOrderId: params.coreOrderId,
    productCatalogItemId: params.productId,
    sku: params.sku,
    location: params.location,
    movementType: params.movementType,
    quantity: params.quantity,
    notes: params.notes,
  });
}

export async function listWarehouseMovements(dealerId?: string, limit = 100) {
  if (isCoreWarehouseEngine()) {
    const core = await listCoreStockMovements(limit);
    const mapped = core.map(mapMovementToLegacyView);

    if (dealerId) {
      const legacy = await prisma.dealerWarehouseMovement.findMany({
        where: { dealerId },
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 50),
        include: { catalogItem: { select: { name: true, sku: true } } },
      });
      return [
        ...mapped,
        ...legacy.map((m) => ({ ...m, engine: "legacy_dealer_warehouse" as const, legacy: true })),
      ].slice(0, limit);
    }
    return mapped;
  }

  return prisma.dealerWarehouseMovement.findMany({
    where: dealerId ? { dealerId } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { catalogItem: { select: { name: true, sku: true } } },
  });
}
