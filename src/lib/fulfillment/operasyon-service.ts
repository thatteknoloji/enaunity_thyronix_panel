import { prisma } from "@/lib/db";
import { updateOrderStatus } from "./orders";
import { getNextOperationStatus, normalizeOperationStatus } from "./operasyon-status";
import { dealerOrderToUnified } from "@/lib/orders/compat-adapter";
import { getCoreOrderDetail, listCoreOrders } from "@/lib/orders/core-order-service";
import { isCoreOrderEngine } from "@/lib/orders/config";
import { HUB_MARKETPLACE_SOURCE } from "@/lib/marketplace-hub/config";
import { fetchTrendyolCommonLabel } from "@/lib/marketplace-hub/trendyol-label";

export type OperasyonItemView = {
  id: string;
  name: string;
  quantity: number;
  salePrice: number;
  barcode: string;
  sku: string;
  imageUrl: string;
};

export type OperasyonOrderView = {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentStatus: string;
  marketplace: string;
  marketplaceOrderId: string;
  sourceType: string;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  createdAt: string;
  engine: string;
  dealer?: { id?: string; name?: string; company?: string };
  items: OperasyonItemView[];
  trackingNumber: string;
  cargoCompany: string;
  shippingLabelUrl: string;
  shippingLabelFileName: string;
};

function parseMeta(json: string | null | undefined): Record<string, unknown> {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return {};
  }
}

function mapItems(items: Array<{
  id: string;
  name: string;
  quantity: number;
  price?: number;
  salePrice?: number;
  barcode?: string;
  sku?: string;
  metadataJson?: string;
}>): OperasyonItemView[] {
  return items.map((i) => {
    const meta = parseMeta(i.metadataJson);
    return {
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      salePrice: i.price ?? i.salePrice ?? 0,
      barcode: i.barcode || String(meta.barcode || ""),
      sku: i.sku || "",
      imageUrl: String(meta.imageUrl || meta.productImageUrl || ""),
    };
  });
}

type CoreOrderShape = {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentStatus: string;
  marketplace: string;
  marketplaceOrderId: string;
  sourceType: string;
  total: number;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  address: string;
  trackingNumber: string;
  carrier: string;
  metadataJson: string;
  createdAt: Date;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    barcode: string;
    sku: string;
    metadataJson: string;
  }>;
  attachments?: Array<{ fileUrl: string; fileName: string; fileType: string }>;
  shipments?: Array<{ trackingNumber?: string; cargoCompany?: string }>;
  dealer?: { id: string; name: string; company: string } | null;
};

function coreToView(order: CoreOrderShape): OperasyonOrderView {
  const meta = parseMeta(order.metadataJson);
  const labelAttachment = order.attachments?.find(
    (a) => a.fileType === "shipping_label" || a.fileType === "pdf"
  );
  const shipment = order.shipments?.[0];

  return {
    id: order.id,
    orderNumber: order.orderNumber || order.id.slice(0, 8),
    status: order.status,
    fulfillmentStatus: normalizeOperationStatus(order.fulfillmentStatus || order.status),
    marketplace: order.marketplace,
    marketplaceOrderId: order.marketplaceOrderId,
    sourceType: order.sourceType,
    totalAmount: order.total,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerCity: order.customerCity,
    customerAddress: String(meta.customerAddress || order.address || ""),
    createdAt: order.createdAt.toISOString(),
    engine: "core",
    dealer: order.dealer || undefined,
    items: mapItems(order.items || []),
    trackingNumber: shipment?.trackingNumber || order.trackingNumber || String(meta.cargoTrackingNumber || ""),
    cargoCompany: shipment?.cargoCompany || order.carrier || String(meta.cargoProviderName || ""),
    shippingLabelUrl: labelAttachment?.fileUrl || String(meta.shippingLabelUrl || ""),
    shippingLabelFileName: labelAttachment?.fileName || "",
  };
}

export function isOperasyonOrder(sourceType: string, marketplace: string) {
  if (marketplace) return true;
  if (sourceType === HUB_MARKETPLACE_SOURCE || sourceType === "MARKETPLACE") return true;
  if (sourceType === "MANUAL" || sourceType === "DEALER_PRODUCT") return true;
  return false;
}

export async function listOperasyonOrders(filters: {
  dealerId?: string;
  fulfillmentStatus?: string;
  limit?: number;
}) {
  if (isCoreOrderEngine()) {
    const coreOrders = await listCoreOrders({
      dealerId: filters.dealerId,
      fulfillmentStatus: filters.fulfillmentStatus,
      limit: filters.limit || 200,
    });

    return coreOrders
      .filter((o) => isOperasyonOrder(o.sourceType, o.marketplace))
      .map((o) => coreToView(o as CoreOrderShape));
  }

  const legacy = await prisma.dealerOrder.findMany({
    where: {
      ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
      ...(filters.fulfillmentStatus ? { status: filters.fulfillmentStatus } : {}),
      marketplace: { not: "" },
    },
    include: {
      items: true,
      dealer: { select: { id: true, name: true, company: true } },
      shipments: true,
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit || 200,
  });

  return legacy.map((o) => {
    const unified = dealerOrderToUnified(o);
    return {
      id: unified.id,
      orderNumber: unified.orderNumber,
      status: unified.status,
      fulfillmentStatus: normalizeOperationStatus(unified.fulfillmentStatus),
      marketplace: unified.marketplace,
      marketplaceOrderId: unified.marketplaceOrderId,
      sourceType: unified.sourceType,
      totalAmount: unified.totalAmount,
      customerName: unified.customerName,
      customerPhone: unified.customerPhone,
      customerCity: unified.customerCity,
      customerAddress: "",
      createdAt: unified.createdAt.toISOString(),
      engine: unified.engine,
      dealer: unified.dealer as OperasyonOrderView["dealer"],
      items: mapItems((o.items || []) as Parameters<typeof mapItems>[0]),
      trackingNumber: o.shipments[0]?.trackingNumber || "",
      cargoCompany: o.shipments[0]?.cargoCompany || "",
      shippingLabelUrl: "",
      shippingLabelFileName: "",
    };
  });
}

export async function getOperasyonOrderDetail(orderId: string, dealerId?: string) {
  const core = await getCoreOrderDetail(orderId, dealerId);
  if (core) {
    if (!isOperasyonOrder(core.sourceType, core.marketplace)) return null;
    return coreToView(core as CoreOrderShape);
  }

  const legacy = await prisma.dealerOrder.findFirst({
    where: { id: orderId, ...(dealerId ? { dealerId } : {}), marketplace: { not: "" } },
    include: {
      items: true,
      shipments: true,
      dealer: { select: { id: true, name: true, company: true } },
    },
  });
  if (!legacy) return null;

  const unified = dealerOrderToUnified(legacy);
  return {
    id: unified.id,
    orderNumber: unified.orderNumber,
    status: unified.status,
    fulfillmentStatus: normalizeOperationStatus(unified.fulfillmentStatus),
    marketplace: unified.marketplace,
    marketplaceOrderId: unified.marketplaceOrderId,
    sourceType: unified.sourceType,
    totalAmount: unified.totalAmount,
    customerName: unified.customerName,
    customerPhone: unified.customerPhone,
    customerCity: unified.customerCity,
    customerAddress: "",
    createdAt: unified.createdAt.toISOString(),
    engine: unified.engine,
    dealer: unified.dealer as OperasyonOrderView["dealer"],
    items: mapItems((legacy.items || []) as Parameters<typeof mapItems>[0]),
    trackingNumber: legacy.shipments[0]?.trackingNumber || "",
    cargoCompany: legacy.shipments[0]?.cargoCompany || "",
    shippingLabelUrl: "",
    shippingLabelFileName: "",
  };
}

export async function advanceOperasyonOrder(orderId: string, changedBy: string) {
  const detail = await getOperasyonOrderDetail(orderId);
  if (!detail) throw new Error("Sipariş bulunamadı");

  const next = getNextOperationStatus(detail.fulfillmentStatus);
  if (!next) throw new Error("Sipariş zaten son adımda");

  await updateOrderStatus(orderId, next);

  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      status: next,
      note: `Operasyon: ${next}`,
      changedBy,
    },
  }).catch(() => {});

  return getOperasyonOrderDetail(orderId, detail.dealer?.id);
}

export async function setOperasyonTracking(
  orderId: string,
  data: { trackingNumber?: string; cargoCompany?: string }
) {
  const core = await prisma.order.findUnique({ where: { id: orderId } });
  if (core) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: data.trackingNumber ?? core.trackingNumber,
        carrier: data.cargoCompany ?? core.carrier,
      },
    });
    const shipment = await prisma.dealerShipment.findFirst({ where: { coreOrderId: orderId } });
    if (shipment) {
      await prisma.dealerShipment.update({
        where: { id: shipment.id },
        data: {
          trackingNumber: data.trackingNumber ?? shipment.trackingNumber,
          cargoCompany: data.cargoCompany ?? shipment.cargoCompany,
        },
      });
    } else if (core.dealerId) {
      await prisma.dealerShipment.create({
        data: {
          coreOrderId: orderId,
          trackingNumber: data.trackingNumber || "",
          cargoCompany: data.cargoCompany || "",
          status: "PENDING",
        },
      });
    }
    return getOperasyonOrderDetail(orderId, core.dealerId || undefined);
  }

  const legacy = await prisma.dealerOrder.findUnique({ where: { id: orderId } });
  if (!legacy) throw new Error("Sipariş bulunamadı");

  const shipment = await prisma.dealerShipment.findFirst({ where: { orderId } });
  if (shipment) {
    await prisma.dealerShipment.update({
      where: { id: shipment.id },
      data: {
        trackingNumber: data.trackingNumber ?? shipment.trackingNumber,
        cargoCompany: data.cargoCompany ?? shipment.cargoCompany,
      },
    });
  }

  return getOperasyonOrderDetail(orderId, legacy.dealerId);
}

export async function attachOperasyonShippingLabel(
  orderId: string,
  file: { fileUrl: string; fileName: string; fileSize?: number }
) {
  const core = await prisma.order.findUnique({ where: { id: orderId } });
  if (!core) throw new Error("Sipariş bulunamadı");

  await prisma.orderAttachment.deleteMany({
    where: { orderId, fileType: { in: ["shipping_label", "pdf"] } },
  });

  await prisma.orderAttachment.create({
    data: {
      orderId,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: "shipping_label",
      fileSize: file.fileSize || 0,
    },
  });

  const meta = parseMeta(core.metadataJson);
  meta.shippingLabelUrl = file.fileUrl;
  await prisma.order.update({
    where: { id: orderId },
    data: { metadataJson: JSON.stringify(meta) },
  });

  return getOperasyonOrderDetail(orderId, core.dealerId || undefined);
}

export async function fetchOperasyonLabelFromTrendyol(orderId: string) {
  const core = await prisma.order.findUnique({ where: { id: orderId } });
  if (!core?.dealerId) throw new Error("Sipariş bulunamadı");

  const meta = parseMeta(core.metadataJson);
  const tracking =
    core.trackingNumber ||
    String(meta.cargoTrackingNumber || "") ||
    core.marketplaceOrderId;

  if (!tracking) {
    throw new Error("Kargo takip numarası yok — önce takip no girin veya TY sync yapın");
  }

  const conn = await prisma.marketplaceConnection.findFirst({
    where: {
      dealerId: core.dealerId,
      active: true,
      platform: { in: ["trendyol", "TRENDYOL", "Trendyol"] },
    },
  });
  if (!conn?.apiKey || !conn.apiSecret) {
    throw new Error("Aktif Trendyol bağlantısı bulunamadı");
  }

  const labels = await fetchTrendyolCommonLabel(
    { sellerId: conn.sellerId, apiKey: conn.apiKey, apiSecret: conn.apiSecret },
    tracking
  );

  const pdf =
    labels.find((l) => l.format?.toUpperCase() === "PDF") ||
    labels.find((l) => l.label?.toLowerCase().includes(".pdf"));

  if (!pdf?.label) {
    throw new Error("Trendyol etiket PDF dönmedi — manuel yükleyin");
  }

  return attachOperasyonShippingLabel(orderId, {
    fileUrl: pdf.label,
    fileName: `ty-etiket-${tracking}.pdf`,
  });
}
