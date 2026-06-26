export const PRODUCTION_STATUSES = [
  "NEW",
  "PREPRESS",
  "PRINTING",
  "PACKAGING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const PRODUCTION_ORDER_SOURCES = [
  "MANUAL",
  "DEALER_ORDER",
  "CORE_ORDER",
  "POD_ORDER",
  "MARKETPLACE",
] as const;

export type ProductionOrderSource = (typeof PRODUCTION_ORDER_SOURCES)[number];

export const PRODUCTION_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export type ProductionPriority = (typeof PRODUCTION_PRIORITIES)[number];

export type ProductionJobDto = {
  id: string;
  jobNumber: string;
  orderSource: string;
  orderId: string;
  dealerId: string | null;
  dealerName: string | null;
  customerName: string;
  productType: string;
  variant: string;
  widthCm: number;
  heightCm: number;
  quantity: number;
  status: string;
  priority: string;
  machineName: string;
  operatorName: string;
  estimatedMinutes: number;
  trackingNumber: string;
  shipmentCompany: string;
  notes: string;
  qualityPassed: boolean;
  qualityNote: string;
  qualityPhotoUrl: string;
  productionPackPath: string;
  previewImage: string;
  productionImage: string;
  pdfPath: string;
  svgPath: string;
  pricingSnapshot: Record<string, unknown>;
  metadata: Record<string, unknown>;
  startedAt: string | null;
  finishedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductionDashboardStats = {
  todayPending: number;
  printing: number;
  packaging: number;
  toShip: number;
  completed: number;
};

export type CreateProductionJobInput = {
  orderSource?: string;
  orderId?: string;
  dealerId?: string;
  customerName?: string;
  productType?: string;
  variant?: string;
  widthCm?: number;
  heightCm?: number;
  quantity?: number;
  status?: string;
  priority?: string;
  machineName?: string;
  operatorName?: string;
  estimatedMinutes?: number;
  notes?: string;
  previewImage?: string;
  productionImage?: string;
  pdfPath?: string;
  svgPath?: string;
  productionPackPath?: string;
  pricingSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  podProjectId?: string;
  dealerOrderId?: string;
  dealerOrderItemId?: string;
  coreOrderId?: string;
};

export type UpdateProductionJobInput = Partial<
  Omit<CreateProductionJobInput, "dealerOrderId" | "dealerOrderItemId" | "coreOrderId" | "podProjectId">
> & {
  status?: string;
  trackingNumber?: string;
  shipmentCompany?: string;
  qualityPassed?: boolean;
  qualityNote?: string;
  qualityPhotoUrl?: string;
  shipped?: boolean;
  delivered?: boolean;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type ProductionJobFilters = {
  status?: string;
  machine?: string;
  operator?: string;
  productType?: string;
  priority?: string;
  search?: string;
  orderSource?: string;
};
