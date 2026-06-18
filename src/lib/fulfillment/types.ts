export const ORDER_STATUSES = [
  "NEW",
  "PROCESSING",
  "WAITING_FOR_PACKING",
  "PACKING",
  "WAITING_FOR_SHIPMENT",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
] as const;

export const MARKETPLACES = [
  "TRENDYOL",
  "HEPSIBURADA",
  "N11",
  "AMAZON",
  "PAZARAMA",
  "CICEKSEPETI",
] as const;

export const CONNECTION_STATUSES = [
  "CONNECTED",
  "DISCONNECTED",
  "ERROR",
  "SYNCING",
] as const;

export const COST_TYPES = [
  "PRODUCT_COST",
  "SHIPPING_COST",
  "PACKAGING_COST",
  "SERVICE_COST",
  "ADJUSTMENT",
] as const;

export const TRANSACTION_TYPES = [
  "ORDER_COST",
  "PAYMENT",
  "REFUND",
  "MANUAL_ADJUSTMENT",
  "SERVICE_FEE",
  "SHIPPING_FEE",
  "PACKAGING_FEE",
] as const;

export const WAREHOUSE_MOVEMENT_TYPES = [
  "IN",
  "OUT",
  "RESERVE",
  "RETURN",
  "ADJUSTMENT",
] as const;

export const SHIPMENT_STATUSES = ["PENDING", "IN_TRANSIT", "DELIVERED", "RETURNED"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type CostType = (typeof COST_TYPES)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type WarehouseMovementType = (typeof WAREHOUSE_MOVEMENT_TYPES)[number];

export type OrderItemInput = {
  productId?: string | null;
  thyronixProductId?: string;
  sku?: string;
  barcode?: string;
  name: string;
  quantity: number;
  salePrice: number;
  costPrice?: number;
};

export type CreateOrderInput = {
  dealerId: string;
  customerName?: string;
  customerPhone?: string;
  customerCity?: string;
  marketplace?: string;
  marketplaceOrderId?: string;
  sourceType?: string;
  thyronixRef?: string;
  items: OrderItemInput[];
  shippingCost?: number;
  packagingCost?: number;
  serviceCost?: number;
  autoAccounting?: boolean;
  initialStatus?: string;
  _forceLegacy?: boolean;
};

export function generateOrderNumber(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `ENA-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${rand}`;
}
