import { prisma } from "@/lib/db";
import { resolveStockProductForOrderItem } from "@/lib/products/product-identity";
import {
  commitStockOut,
  getAvailableStock,
  releaseReservation,
  reserveStockForOrderLines,
  returnStock,
} from "@/lib/warehouse/warehouse-service";
import { RESERVE_TYPES } from "@/lib/warehouse/config";

export type OrderStockStatus = {
  orderId: string;
  reserved: boolean;
  hasWarnings: boolean;
  warnings: string[];
  items: Array<{
    orderItemId: string;
    productId: string | null;
    productName?: string;
    quantity: number;
    reserved: boolean;
    availableStock?: number;
    insufficient: boolean;
    unmatched: boolean;
    warning?: string;
  }>;
};

function parseMetadata(json: string) {
  try {
    return JSON.parse(json || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function reserveStockForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return null;

  const reserveItems: Array<{
    orderItemId: string;
    productId: string;
    quantity: number;
    sku?: string;
  }> = [];
  const warnings: string[] = [];

  for (const item of order.items) {
    const resolved = await resolveStockProductForOrderItem(item);
    if (!resolved.productId) {
      warnings.push(resolved.warning || `Eşleşmeyen ürün: ${item.name}`);
      continue;
    }
    reserveItems.push({
      orderItemId: item.id,
      productId: resolved.productId,
      quantity: item.quantity,
      sku: item.sku || undefined,
    });
  }

  let result = { alreadyReserved: false, movements: [] as unknown[], warnings: [] as string[] };
  if (reserveItems.length > 0) {
    result = await reserveStockForOrderLines({
      orderId,
      dealerId: order.dealerId || undefined,
      items: reserveItems,
    });
    warnings.push(...result.warnings);
  }

  const meta = parseMetadata(order.metadataJson);
  const stockMeta = {
    ...(typeof meta.stock === "object" && meta.stock !== null ? (meta.stock as object) : {}),
    reserved: !result.alreadyReserved && reserveItems.length > 0,
    reservedAt: new Date().toISOString(),
    warnings,
    engine: "core",
  };

  const fulfillmentStatus =
    warnings.some((w) => w.includes("Yetersiz"))
      ? order.fulfillmentStatus || "WAITING_FOR_PACKING"
      : order.fulfillmentStatus;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      metadataJson: JSON.stringify({ ...meta, stock: stockMeta, stockWarning: warnings.length > 0 }),
      fulfillmentStatus,
      hasBackorder: warnings.some((w) => w.includes("Yetersiz")) || order.hasBackorder,
    },
  });

  return { ...result, warnings, orderId };
}

export async function releaseOrderReservations(orderId: string, dealerId?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return [];

  const releases = [];
  for (const item of order.items) {
    const resolved = await resolveStockProductForOrderItem(item);
    if (!resolved.productId) continue;
    const existing = await prisma.stockMovement.findFirst({
      where: {
        orderId,
        productId: resolved.productId,
        type: { in: [...RESERVE_TYPES, "RESERVE"] },
      },
    });
    if (!existing) continue;
    releases.push(
      await releaseReservation({
        orderId,
        productId: resolved.productId,
        quantity: item.quantity,
        dealerId: dealerId || order.dealerId || undefined,
        sku: item.sku || undefined,
      })
    );
  }
  return releases;
}

export async function commitOrderStockOut(orderId: string, dealerId?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return [];

  const outs = [];
  for (const item of order.items) {
    const resolved = await resolveStockProductForOrderItem(item);
    if (!resolved.productId) continue;
    outs.push(
      await commitStockOut({
        orderId,
        productId: resolved.productId,
        quantity: item.quantity,
        dealerId: dealerId || order.dealerId || undefined,
        sku: item.sku || undefined,
      })
    );
  }
  return outs;
}

export async function returnOrderStock(orderId: string, dealerId?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return [];

  const returns = [];
  for (const item of order.items) {
    const resolved = await resolveStockProductForOrderItem(item);
    if (!resolved.productId) continue;
    returns.push(
      await returnStock({
        orderId,
        productId: resolved.productId,
        quantity: item.quantity,
        dealerId: dealerId || order.dealerId || undefined,
        sku: item.sku || undefined,
      })
    );
  }
  return returns;
}

export async function getOrderStockStatus(orderId: string): Promise<OrderStockStatus | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return null;

  const meta = parseMetadata(order.metadataJson);
  const stockMeta = (meta.stock || {}) as Record<string, unknown>;
  const metaWarnings = Array.isArray(stockMeta.warnings) ? (stockMeta.warnings as string[]) : [];

  const hasReserveMovement = !!(await prisma.stockMovement.findFirst({
    where: { orderId, type: { in: [...RESERVE_TYPES, "RESERVE"] } },
  }));

  const items = [];
  for (const item of order.items) {
    const resolved = await resolveStockProductForOrderItem(item);
    let availableStock: number | undefined;
    let reserved = false;
    if (resolved.productId) {
      const avail = await getAvailableStock(resolved.productId);
      availableStock = avail.availableStock;
      reserved = !!(await prisma.stockMovement.findFirst({
        where: {
          orderId,
          productId: resolved.productId,
          type: { in: [...RESERVE_TYPES, "RESERVE"] },
        },
      }));
    }
    items.push({
      orderItemId: item.id,
      productId: resolved.productId,
      productName: resolved.productName || item.name,
      quantity: item.quantity,
      reserved,
      availableStock,
      insufficient: resolved.productId ? (availableStock ?? 0) < item.quantity : false,
      unmatched: resolved.unmatched,
      warning: resolved.warning,
    });
  }

  const warnings = [
    ...metaWarnings,
    ...items.filter((i) => i.warning).map((i) => i.warning!),
    ...items.filter((i) => i.insufficient).map((i) => `Yetersiz stok: ${i.productName}`),
  ];

  return {
    orderId,
    reserved: hasReserveMovement || stockMeta.reserved === true,
    hasWarnings: warnings.length > 0,
    warnings,
    items,
  };
}
