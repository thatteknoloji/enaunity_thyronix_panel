import { prisma } from "@/lib/db";
import type { Prisma, ProductionJob } from "@prisma/client";
import { resolvePodProductionAssets } from "./pod-production-bridge";
import type {
  CreateProductionJobInput,
  ProductionDashboardStats,
  ProductionJobDto,
  ProductionJobFilters,
  UpdateProductionJobInput,
} from "./types";
import { PRODUCTION_STATUSES } from "./types";

function parseJson(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toDto(row: ProductionJob & { dealer?: { name: string } | null }): ProductionJobDto {
  return {
    id: row.id,
    jobNumber: row.jobNumber,
    orderSource: row.orderSource,
    orderId: row.orderId,
    dealerId: row.dealerId,
    dealerName: row.dealer?.name ?? null,
    customerName: row.customerName,
    productType: row.productType,
    variant: row.variant,
    widthCm: row.widthCm,
    heightCm: row.heightCm,
    quantity: row.quantity,
    status: row.status,
    priority: row.priority,
    machineName: row.machineName,
    operatorName: row.operatorName,
    estimatedMinutes: row.estimatedMinutes,
    trackingNumber: row.trackingNumber,
    shipmentCompany: row.shipmentCompany,
    notes: row.notes,
    qualityPassed: row.qualityPassed,
    qualityNote: row.qualityNote,
    qualityPhotoUrl: row.qualityPhotoUrl,
    productionPackPath: row.productionPackPath,
    previewImage: row.previewImage,
    productionImage: row.productionImage,
    pdfPath: row.pdfPath,
    svgPath: row.svgPath,
    pricingSnapshot: parseJson(row.pricingSnapshotJson),
    metadata: parseJson(row.metadataJson),
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    shippedAt: row.shippedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function nextJobNumber(): Promise<string> {
  const prefix = `PJ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const count = await prisma.productionJob.count({
    where: { jobNumber: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export async function buildPayloadFromDealerOrder(
  dealerOrderId: string,
  dealerOrderItemId?: string
): Promise<CreateProductionJobInput> {
  const order = await prisma.dealerOrder.findUnique({
    where: { id: dealerOrderId },
    include: {
      items: true,
      dealer: { select: { id: true, name: true } },
    },
  });
  if (!order) throw new Error("Bayi siparişi bulunamadı");

  const item =
    (dealerOrderItemId ? order.items.find((i) => i.id === dealerOrderItemId) : undefined) ??
    order.items[0];

  return {
    orderSource: "DEALER_ORDER",
    orderId: order.id,
    dealerId: order.dealerId,
    customerName: order.customerName || order.dealer.name,
    productType: item?.name ?? "Ürün",
    variant: item?.sku || item?.barcode || "",
    quantity: item?.quantity ?? 1,
    metadata: {
      dealerOrderNumber: order.orderNumber,
      marketplace: order.marketplace,
      marketplaceOrderId: order.marketplaceOrderId,
      dealerOrderItemId: item?.id ?? "",
      sourceType: order.sourceType,
    },
  };
}

export async function buildPayloadFromCoreOrder(
  coreOrderId: string,
  dealerId: string
): Promise<CreateProductionJobInput> {
  const order = await prisma.order.findFirst({
    where: { id: coreOrderId, dealerId },
    include: {
      items: { include: { product: true, productCatalogItem: true } },
      user: { select: { name: true } },
    },
  });
  if (!order) throw new Error("Sipariş bulunamadı");

  const item = order.items[0];
  const productName =
    item?.product?.name || item?.productCatalogItem?.name || "Ürün";
  const meta = parseJson(order.metadataJson ?? "{}");

  return {
    orderSource: "CORE_ORDER",
    orderId: order.id,
    dealerId: order.dealerId ?? dealerId,
    customerName: order.user?.name || String(meta.customerName || ""),
    productType: productName,
    variant: item?.product?.sku ?? "",
    quantity: item?.quantity ?? 1,
    metadata: {
      coreOrderId: order.id,
      orderStatus: order.status,
      podProjectId: meta.podProjectId ? String(meta.podProjectId) : undefined,
    },
    podProjectId: meta.podProjectId ? String(meta.podProjectId) : undefined,
  };
}

function buildWhere(filters: ProductionJobFilters): Prisma.ProductionJobWhereInput {
  const where: Prisma.ProductionJobWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.machine) where.machineName = filters.machine;
  if (filters.operator) where.operatorName = filters.operator;
  if (filters.productType) where.productType = { contains: filters.productType };
  if (filters.priority) where.priority = filters.priority;
  if (filters.orderSource) where.orderSource = filters.orderSource;
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { jobNumber: { contains: q } },
      { customerName: { contains: q } },
      { productType: { contains: q } },
      { orderId: { contains: q } },
      { trackingNumber: { contains: q } },
    ];
  }
  return where;
}

export async function getProductionDashboardStats(): Promise<ProductionDashboardStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayPending, printing, packaging, toShip, completed] = await Promise.all([
    prisma.productionJob.count({
      where: { status: "NEW", createdAt: { gte: startOfDay } },
    }),
    prisma.productionJob.count({ where: { status: "PRINTING" } }),
    prisma.productionJob.count({ where: { status: "PACKAGING" } }),
    prisma.productionJob.count({ where: { status: "SHIPPED", deliveredAt: null } }),
    prisma.productionJob.count({ where: { status: "COMPLETED" } }),
  ]);

  return { todayPending, printing, packaging, toShip, completed };
}

export async function listProductionJobs(filters: ProductionJobFilters = {}): Promise<ProductionJobDto[]> {
  const rows = await prisma.productionJob.findMany({
    where: buildWhere(filters),
    include: { dealer: { select: { name: true } } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toDto);
}

export async function getProductionJob(id: string): Promise<ProductionJobDto | null> {
  const row = await prisma.productionJob.findUnique({
    where: { id },
    include: { dealer: { select: { name: true } } },
  });
  return row ? toDto(row) : null;
}

export async function findJobByOrder(orderSource: string, orderId: string): Promise<ProductionJobDto | null> {
  const row = await prisma.productionJob.findFirst({
    where: { orderSource, orderId },
    include: { dealer: { select: { name: true } } },
  });
  return row ? toDto(row) : null;
}

function applyStatusTimestamps(
  current: ProductionJob,
  nextStatus: string
): Partial<Prisma.ProductionJobUpdateInput> {
  const patch: Partial<Prisma.ProductionJobUpdateInput> = {};
  const active = ["PREPRESS", "PRINTING", "PACKAGING"];
  if (!current.startedAt && active.includes(nextStatus)) {
    patch.startedAt = new Date();
  }
  if (nextStatus === "SHIPPED" && !current.shippedAt) {
    patch.shippedAt = new Date();
  }
  if (nextStatus === "COMPLETED") {
    if (!current.finishedAt) patch.finishedAt = new Date();
    if (!current.deliveredAt) patch.deliveredAt = new Date();
  }
  if (nextStatus === "CANCELLED" && !current.finishedAt) {
    patch.finishedAt = new Date();
  }
  return patch;
}

export async function createProductionJob(input: CreateProductionJobInput): Promise<ProductionJobDto> {
  let payload = { ...input };

  if (input.dealerOrderId) {
    const fromOrder = await buildPayloadFromDealerOrder(input.dealerOrderId, input.dealerOrderItemId);
    payload = { ...fromOrder, ...input, dealerOrderId: undefined, dealerOrderItemId: undefined };
  } else if (input.coreOrderId && input.dealerId) {
    const fromCore = await buildPayloadFromCoreOrder(input.coreOrderId, input.dealerId);
    payload = { ...fromCore, ...input, coreOrderId: undefined };
  }

  const podId =
    payload.podProjectId ||
    (payload.metadata?.podProjectId ? String(payload.metadata.podProjectId) : undefined);
  if (podId) {
    const podAssets = await resolvePodProductionAssets(podId);
    payload = { ...podAssets, ...payload, podProjectId: undefined };
    if (!payload.orderSource || payload.orderSource === "MANUAL") {
      payload.orderSource = "POD_ORDER";
    }
  }

  const existing = payload.orderSource && payload.orderId
    ? await findJobByOrder(payload.orderSource, payload.orderId)
    : null;
  if (existing) {
    throw new Error(`Bu sipariş için üretim işi zaten var: ${existing.jobNumber}`);
  }

  const status = payload.status ?? "NEW";
  if (!(PRODUCTION_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Geçersiz üretim durumu");
  }

  const row = await prisma.productionJob.create({
    data: {
      jobNumber: await nextJobNumber(),
      orderSource: payload.orderSource ?? "MANUAL",
      orderId: payload.orderId ?? "",
      dealerId: payload.dealerId || null,
      customerName: payload.customerName ?? "",
      productType: payload.productType ?? "",
      variant: payload.variant ?? "",
      widthCm: payload.widthCm ?? 0,
      heightCm: payload.heightCm ?? 0,
      quantity: Math.max(1, payload.quantity ?? 1),
      status,
      priority: payload.priority ?? "NORMAL",
      machineName: payload.machineName ?? "",
      operatorName: payload.operatorName ?? "",
      estimatedMinutes: payload.estimatedMinutes ?? 0,
      notes: payload.notes ?? "",
      previewImage: payload.previewImage ?? "",
      productionImage: payload.productionImage ?? "",
      pdfPath: payload.pdfPath ?? "",
      svgPath: payload.svgPath ?? "",
      productionPackPath: payload.productionPackPath ?? "",
      pricingSnapshotJson: JSON.stringify(payload.pricingSnapshot ?? {}),
      metadataJson: JSON.stringify(payload.metadata ?? {}),
      startedAt: status !== "NEW" && status !== "CANCELLED" ? new Date() : null,
    },
    include: { dealer: { select: { name: true } } },
  });
  return toDto(row);
}

export async function updateProductionJob(
  id: string,
  input: UpdateProductionJobInput
): Promise<ProductionJobDto> {
  const current = await prisma.productionJob.findUnique({ where: { id } });
  if (!current) throw new Error("Üretim işi bulunamadı");

  if (input.status && !(PRODUCTION_STATUSES as readonly string[]).includes(input.status)) {
    throw new Error("Geçersiz üretim durumu");
  }

  const timePatch =
    input.status && input.status !== current.status
      ? applyStatusTimestamps(current, input.status)
      : {};

  const shipmentPatch: Partial<Prisma.ProductionJobUpdateInput> = {};
  if (input.shipped === true && !current.shippedAt) {
    shipmentPatch.shippedAt = new Date();
    if (!input.status) shipmentPatch.status = "SHIPPED";
  }
  if (input.delivered === true && !current.deliveredAt) {
    shipmentPatch.deliveredAt = new Date();
    if (!input.status) shipmentPatch.status = "COMPLETED";
    if (!current.finishedAt) shipmentPatch.finishedAt = new Date();
  }

  const metadata =
    input.metadata !== undefined
      ? { ...parseJson(current.metadataJson), ...input.metadata }
      : undefined;

  const pricingSnapshot =
    input.pricingSnapshot !== undefined
      ? { ...parseJson(current.pricingSnapshotJson), ...input.pricingSnapshot }
      : undefined;

  const data: Prisma.ProductionJobUpdateInput = {
    ...(input.orderSource !== undefined && { orderSource: input.orderSource }),
    ...(input.orderId !== undefined && { orderId: input.orderId }),
    ...(input.customerName !== undefined && { customerName: input.customerName }),
    ...(input.productType !== undefined && { productType: input.productType }),
    ...(input.variant !== undefined && { variant: input.variant }),
    ...(input.widthCm !== undefined && { widthCm: input.widthCm }),
    ...(input.heightCm !== undefined && { heightCm: input.heightCm }),
    ...(input.quantity !== undefined && { quantity: Math.max(1, input.quantity) }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.machineName !== undefined && { machineName: input.machineName }),
    ...(input.operatorName !== undefined && { operatorName: input.operatorName }),
    ...(input.estimatedMinutes !== undefined && { estimatedMinutes: input.estimatedMinutes }),
    ...(input.trackingNumber !== undefined && { trackingNumber: input.trackingNumber }),
    ...(input.shipmentCompany !== undefined && { shipmentCompany: input.shipmentCompany }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.qualityPassed !== undefined && { qualityPassed: input.qualityPassed }),
    ...(input.qualityNote !== undefined && { qualityNote: input.qualityNote }),
    ...(input.qualityPhotoUrl !== undefined && { qualityPhotoUrl: input.qualityPhotoUrl }),
    ...(input.previewImage !== undefined && { previewImage: input.previewImage }),
    ...(input.productionImage !== undefined && { productionImage: input.productionImage }),
    ...(input.pdfPath !== undefined && { pdfPath: input.pdfPath }),
    ...(input.svgPath !== undefined && { svgPath: input.svgPath }),
    ...(input.productionPackPath !== undefined && { productionPackPath: input.productionPackPath }),
    ...(pricingSnapshot !== undefined && { pricingSnapshotJson: JSON.stringify(pricingSnapshot) }),
    ...(metadata !== undefined && { metadataJson: JSON.stringify(metadata) }),
    ...(input.startedAt !== undefined && {
      startedAt: input.startedAt ? new Date(input.startedAt) : null,
    }),
    ...(input.finishedAt !== undefined && {
      finishedAt: input.finishedAt ? new Date(input.finishedAt) : null,
    }),
    ...timePatch,
    ...shipmentPatch,
  };

  if (input.dealerId !== undefined) {
    data.dealer = input.dealerId
      ? { connect: { id: input.dealerId } }
      : { disconnect: true };
  }

  const row = await prisma.productionJob.update({
    where: { id },
    data,
    include: { dealer: { select: { name: true } } },
  });
  return toDto(row);
}

export async function listDealerOrdersForProduction(limit = 50) {
  return prisma.dealerOrder.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      status: true,
      marketplace: true,
      createdAt: true,
      dealer: { select: { id: true, name: true } },
      items: { select: { id: true, name: true, quantity: true, sku: true } },
    },
  });
}
