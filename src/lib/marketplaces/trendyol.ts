import { prisma } from "@/lib/db";

const TRENDYOL_BASE = "https://api.trendyol.com/sapigw/suppliers";

function basicAuth(apiKey: string, apiSecret: string): string {
  return Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
}

interface TrendyolConnection {
  sellerId: string;
  apiKey: string;
  apiSecret: string;
}

async function fetchTrendyol<T>(conn: TrendyolConnection, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${TRENDYOL_BASE}/${conn.sellerId}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${basicAuth(conn.apiKey, conn.apiSecret)}`,
      "Content-Type": "application/json",
      "User-Agent": `${conn.sellerId} - SelfIntegration`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trendyol API ${res.status}: ${text.substring(0, 200)}`);
  }
  return res.json();
}

export interface TrendyolPackage {
  orderNumber: string;
  grossAmount: number;
  totalDiscount: number;
  totalPrice: number;
  status: string;
  shipmentAddress: {
    firstName: string;
    lastName: string;
    city: string;
    district: string;
    address1: string;
    address2?: string;
    phoneNumber: string;
    fullName?: string;
    addressDetail?: string;
  };
  lines: {
    lineId?: number;
    quantity: number;
    price: number;
    productName: string;
    barcode?: string;
    amount?: number;
  }[];
  cargoTrackingNumber?: string;
  cargoProviderName?: string;
}

export interface TrendyolPackagesResponse {
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  content: TrendyolPackage[];
}

export interface TrendyolVariant {
  barcode: string;
  title: string;
  price: number;
  stock: number;
  optionGroupName?: string;
  attributeName?: string;
  attributeValue?: string;
}

export interface TrendyolProduct {
  barcode: string;
  title: string;
  productMainId: string;
  brand: string;
  categoryName: string;
  stockCode?: string;
  description?: string;
  images?: { url: string }[];
  attributes?: { name: string; value: string }[];
  variants: TrendyolVariant[];
}

export interface TrendyolProductsResponse {
  products: TrendyolProduct[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export const trendyol = {
  async fetchProducts(conn: TrendyolConnection, params: {
    page?: number;
    size?: number;
    barcode?: string;
    stockCode?: string;
    createdDateBegin?: number;
    createdDateEnd?: number;
  } = {}) {
    const query = new URLSearchParams();
    query.set("page", (params.page || 0).toString());
    query.set("size", (params.size || 100).toString());
    if (params.barcode) query.set("barcode", params.barcode);
    if (params.stockCode) query.set("stockCode", params.stockCode);
    if (params.createdDateBegin) query.set("createdDateBegin", params.createdDateBegin.toString());
    if (params.createdDateEnd) query.set("createdDateEnd", params.createdDateEnd.toString());

    return fetchTrendyol<TrendyolProductsResponse>(
      conn,
      `/products?${query.toString()}`
    );
  },

  async fetchOrders(conn: TrendyolConnection, params: {
    startDate?: number;
    endDate?: number;
    status?: string;
    page?: number;
    size?: number;
  } = {}) {
    const query = new URLSearchParams();
    if (params.startDate) query.set("startDate", params.startDate.toString());
    if (params.endDate) query.set("endDate", params.endDate.toString());
    query.set("page", (params.page || 0).toString());
    query.set("size", (params.size || 50).toString());
    query.set("orderByField", "LastModifiedDate");
    query.set("orderByDirection", "DESC");

    return fetchTrendyol<TrendyolPackagesResponse>(
      conn,
      `/orders?${query.toString()}`
    );
  },

  async getAllNewPackages(conn: TrendyolConnection, lastSyncAt?: Date | null): Promise<TrendyolPackage[]> {
    const allOrders: TrendyolPackage[] = [];
    const startDate = lastSyncAt
      ? Math.floor(lastSyncAt.getTime())
      : Date.now() - 7 * 24 * 60 * 60 * 1000;

    let page = 0;
    let hasMore = true;

    while (hasMore && page < 5) {
      const res = await this.fetchOrders(conn, {
        startDate,
        page,
        size: 100,
      });

      allOrders.push(...res.content);
      hasMore = page < res.totalPages - 1;
      page++;
    }

    return allOrders;
  },

  async updatePackageStatus(conn: TrendyolConnection, packageId: string, lineItems: { lineItemId: number; quantity: number }[]) {
    const body = {
      lines: lineItems.map(l => ({
        lineId: l.lineItemId,
        quantity: l.quantity,
      })),
      params: { invoiceIncluded: false },
      status: "Invoiced" as const,
    };

    return fetchTrendyol(
      conn,
      `/shipment-packages/${packageId}`,
      { method: "PUT", body: JSON.stringify(body) }
    );
  },

  async sendInvoiceLink(conn: TrendyolConnection, packageId: string, invoiceUrl: string) {
    const body = [{
      invoiceLink: invoiceUrl,
      invoiceLinkType: "EARSIV",
    }];

    return fetchTrendyol(
      conn,
      `/suppliers/${conn.sellerId}/invoices/link/${packageId}`,
      { method: "POST", body: JSON.stringify(body) }
    );
  },
};

export async function getPlatformClient(connection: { platform: string; sellerId: string; apiKey: string; apiSecret?: string }) {
  switch (connection.platform) {
    case "trendyol":
      return trendyol;
    case "hepsiburada":
      throw new Error("Hepsiburada henüz eklenmedi");
    case "n11":
      throw new Error("N11 henüz eklenmedi");
    default:
      throw new Error(`Bilinmeyen platform: ${connection.platform}`);
  }
}
