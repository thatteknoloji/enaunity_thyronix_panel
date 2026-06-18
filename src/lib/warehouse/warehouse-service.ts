import { prisma } from "@/lib/db";
import {
  IN_TYPES,
  OUT_TYPES,
  RELEASE_TYPES,
  RESERVE_TYPES,
  RETURN_TYPES,
  normalizeMovementType,
} from "./config";
import { mirrorDealerWarehouseMovement } from "./dealer-warehouse-mirror";

export type CreateMovementParams = {
  productId: string;
  warehouseId?: string;
  type: string;
  quantity: number;
  note?: string;
  orderId?: string;
  dealerId?: string;
  sku?: string;
  coreOrderId?: string;
};

async function resolveWarehouseId(warehouseId?: string) {
  if (warehouseId) return warehouseId;
  const wh = await getDefaultWarehouse();
  return wh.id;
}

export async function getDefaultWarehouse() {
  let warehouse = await prisma.warehouse.findFirst({ where: { isDefault: true } });
  if (!warehouse) warehouse = await prisma.warehouse.findFirst({ orderBy: { createdAt: "asc" } });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: { name: "Ana Depo", location: "MAIN", isDefault: true },
    });
  }
  return warehouse;
}

export async function ensureProductWarehouse(productId: string, warehouseId?: string) {
  const whId = await resolveWarehouseId(warehouseId);
  return prisma.productWarehouse.upsert({
    where: { productId_warehouseId: { productId, warehouseId: whId } },
    update: {},
    create: { productId, warehouseId: whId, stock: 0 },
  });
}

export async function getReservedQuantity(productId: string, warehouseId?: string) {
  const whId = await resolveWarehouseId(warehouseId);
  const movements = await prisma.stockMovement.findMany({
    where: { productId, warehouseId: whId },
    orderBy: { createdAt: "asc" },
  });

  let reserved = 0;
  for (const m of movements) {
    const type = normalizeMovementType(m.type);
    if (RESERVE_TYPES.includes(m.type) || type === "RESERVE") reserved += m.quantity;
    if (RELEASE_TYPES.includes(m.type) || type === "RELEASE_RESERVE") reserved -= m.quantity;
    if (OUT_TYPES.includes(m.type) || type === "OUT") {
      if (m.orderId) reserved = Math.max(0, reserved - m.quantity);
    }
  }
  return Math.max(0, reserved);
}

export async function getAvailableStock(productId: string, warehouseId?: string) {
  const pw = await ensureProductWarehouse(productId, warehouseId);
  const reserved = await getReservedQuantity(productId, pw.warehouseId);
  return {
    productId,
    warehouseId: pw.warehouseId,
    stock: pw.stock,
    reservedStock: reserved,
    availableStock: pw.stock - reserved,
  };
}

export async function createStockMovement(params: CreateMovementParams) {
  const warehouseId = await resolveWarehouseId(params.warehouseId);
  const type = normalizeMovementType(params.type);
  const movement = await prisma.stockMovement.create({
    data: {
      productId: params.productId,
      warehouseId,
      type,
      quantity: Math.abs(params.quantity),
      note: params.note || "",
      orderId: params.orderId || null,
    },
  });

  await mirrorDealerWarehouseMovement({
    dealerId: params.dealerId,
    orderId: params.coreOrderId ? undefined : params.orderId,
    coreOrderId: params.coreOrderId,
    productId: params.productId,
    sku: params.sku,
    movementType: type,
    quantity: params.quantity,
    notes: params.note,
    stockSnapshot: await getAvailableStock(params.productId, warehouseId),
  });

  return movement;
}

export async function adjustStock(params: {
  productId: string;
  warehouseId?: string;
  quantity: number;
  note?: string;
  orderId?: string;
  dealerId?: string;
}) {
  const warehouseId = await resolveWarehouseId(params.warehouseId);
  const pw = await ensureProductWarehouse(params.productId, warehouseId);
  await prisma.productWarehouse.update({
    where: { id: pw.id },
    data: { stock: { increment: params.quantity } },
  });
  await createStockMovement({
    productId: params.productId,
    warehouseId,
    type: "ADJUSTMENT",
    quantity: params.quantity,
    note: params.note,
    orderId: params.orderId,
    dealerId: params.dealerId,
  });
  await syncProductStock(params.productId);
  return getAvailableStock(params.productId, warehouseId);
}

export async function reserveStockForOrderLines(params: {
  orderId: string;
  dealerId?: string;
  items: Array<{
    orderItemId: string;
    productId: string;
    quantity: number;
    sku?: string;
  }>;
}) {
  const existing = await prisma.stockMovement.findFirst({
    where: {
      orderId: params.orderId,
      type: { in: [...RESERVE_TYPES, "RESERVE"] },
    },
  });
  if (existing) {
    return { alreadyReserved: true as const, movements: [], warnings: [] as string[] };
  }

  const warehouse = await getDefaultWarehouse();
  const movements = [];
  const warnings: string[] = [];

  for (const item of params.items) {
    const available = await getAvailableStock(item.productId, warehouse.id);
    if (available.availableStock < item.quantity) {
      warnings.push(
        `Yetersiz stok: ${item.sku || item.productId} (mevcut: ${available.availableStock}, istenen: ${item.quantity})`
      );
    }
    const movement = await createStockMovement({
      productId: item.productId,
      warehouseId: warehouse.id,
      type: "RESERVE",
      quantity: item.quantity,
      note: `Sipariş rezervasyonu #${params.orderId.slice(0, 8)} item:${item.orderItemId}`,
      orderId: params.orderId,
      dealerId: params.dealerId,
      sku: item.sku,
      coreOrderId: params.orderId,
    });
    movements.push(movement);
  }

  return { alreadyReserved: false as const, movements, warnings };
}

export async function releaseReservation(params: {
  orderId: string;
  productId: string;
  quantity: number;
  dealerId?: string;
  sku?: string;
  note?: string;
}) {
  const warehouse = await getDefaultWarehouse();
  return createStockMovement({
    productId: params.productId,
    warehouseId: warehouse.id,
    type: "RELEASE_RESERVE",
    quantity: params.quantity,
    note: params.note || `Rezervasyon iptal #${params.orderId.slice(0, 8)}`,
    orderId: params.orderId,
    dealerId: params.dealerId,
    sku: params.sku,
    coreOrderId: params.orderId,
  });
}

export async function commitStockOut(params: {
  orderId: string;
  productId: string;
  quantity: number;
  dealerId?: string;
  sku?: string;
  note?: string;
}) {
  const warehouse = await getDefaultWarehouse();
  const pw = await ensureProductWarehouse(params.productId, warehouse.id);
  await prisma.productWarehouse.update({
    where: { id: pw.id },
    data: { stock: { decrement: params.quantity } },
  });
  const movement = await createStockMovement({
    productId: params.productId,
    warehouseId: warehouse.id,
    type: "OUT",
    quantity: params.quantity,
    note: params.note || `Sevkiyat #${params.orderId.slice(0, 8)}`,
    orderId: params.orderId,
    dealerId: params.dealerId,
    sku: params.sku,
    coreOrderId: params.orderId,
  });
  await syncProductStock(params.productId);
  return movement;
}

export async function returnStock(params: {
  orderId?: string;
  productId: string;
  quantity: number;
  dealerId?: string;
  sku?: string;
  note?: string;
}) {
  const warehouse = await getDefaultWarehouse();
  const pw = await ensureProductWarehouse(params.productId, warehouse.id);
  await prisma.productWarehouse.update({
    where: { id: pw.id },
    data: { stock: { increment: params.quantity } },
  });
  const movement = await createStockMovement({
    productId: params.productId,
    warehouseId: warehouse.id,
    type: "RETURN",
    quantity: params.quantity,
    note: params.note || `İade${params.orderId ? ` #${params.orderId.slice(0, 8)}` : ""}`,
    orderId: params.orderId,
    dealerId: params.dealerId,
    sku: params.sku,
    coreOrderId: params.orderId,
  });
  await syncProductStock(params.productId);
  return movement;
}

export async function syncProductStock(productId: string) {
  const agg = await prisma.productWarehouse.aggregate({
    where: { productId },
    _sum: { stock: true },
  });
  const total = agg._sum.stock || 0;
  await prisma.product.update({
    where: { id: productId },
    data: { stock: total },
  });
  return total;
}

export async function listCoreStockMovements(limit = 200) {
  return prisma.stockMovement.findMany({
    include: {
      product: { select: { id: true, name: true, sku: true, barcode: true } },
      warehouse: { select: { id: true, name: true, location: true } },
      order: { select: { id: true, orderNumber: true, dealerId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getWarehouseHealthIssues() {
  const issues: string[] = [];

  const products = await prisma.product.findMany({
    select: { id: true, name: true, stock: true },
    take: 500,
  });

  for (const p of products) {
    const agg = await prisma.productWarehouse.aggregate({
      where: { productId: p.id },
      _sum: { stock: true },
    });
    const whTotal = agg._sum.stock || 0;
    if (whTotal !== p.stock) {
      issues.push(`Product.stock uyumsuz: ${p.name} (${p.stock} vs depo ${whTotal})`);
    }
    const available = await getAvailableStock(p.id);
    if (available.availableStock < 0) {
      issues.push(`Negatif kullanılabilir stok: ${p.name}`);
    }
  }

  const unmatchedOrders = await prisma.order.findMany({
    where: {
      fulfillmentStatus: { in: ["WAITING_FOR_PACKING", "PROCESSING", "NEW"] },
      metadataJson: { contains: "stockWarning" },
    },
    select: { id: true, orderNumber: true },
    take: 20,
  });
  for (const o of unmatchedOrders) {
    issues.push(`Stok uyarısı: sipariş ${o.orderNumber || o.id.slice(0, 8)}`);
  }

  const reservedCancelled = await prisma.order.findMany({
    where: { status: "cancelled" },
    select: { id: true, orderNumber: true },
    take: 50,
  });
  for (const o of reservedCancelled) {
    const reserve = await prisma.stockMovement.findFirst({
      where: { orderId: o.id, type: { in: [...RESERVE_TYPES, "RESERVE"] } },
    });
    const release = await prisma.stockMovement.findFirst({
      where: { orderId: o.id, type: { in: [...RELEASE_TYPES, "RELEASE_RESERVE"] } },
    });
    if (reserve && !release) {
      issues.push(`İptal siparişte açık rezervasyon: ${o.orderNumber || o.id.slice(0, 8)}`);
    }
  }

  return issues;
}

export function mapMovementToLegacyView(m: {
  id: string;
  type: string;
  quantity: number;
  note: string;
  createdAt: Date;
  product: { name: string; sku: string; barcode: string };
  warehouse?: { name: string; location: string } | null;
  order?: { orderNumber: string } | null;
}) {
  const type = normalizeMovementType(m.type);
  const snapshot = { stock: 0, reservedStock: 0, availableStock: 0 };
  return {
    id: m.id,
    sku: m.product.sku || m.product.barcode,
    location: m.warehouse?.location || m.warehouse?.name || "MAIN",
    movementType: type,
    quantity: m.quantity,
    notes: m.note,
    stock: snapshot.stock,
    reservedStock: snapshot.reservedStock,
    availableStock: snapshot.availableStock,
    createdAt: m.createdAt,
    catalogItem: { name: m.product.name, sku: m.product.sku },
    engine: "core" as const,
    legacy: false,
    orderNumber: m.order?.orderNumber,
  };
}
