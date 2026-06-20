import type { TrendyolPackage } from "@/lib/marketplaces/trendyol";
import type { TrendyolConnectionCredentials } from "./providers/trendyol-provider";

const INTEGRATION_ORDER_BASE = "https://apigw.trendyol.com/integration/order/sellers";

function basicAuth(apiKey: string, apiSecret: string): string {
  return Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
}

type IntegrationOrderLine = {
  productName?: string;
  barcode?: string;
  quantity?: number;
  price?: number;
  amount?: number;
  merchantSku?: string;
  sku?: string;
};

type IntegrationShipmentPackage = {
  id?: number;
  orderNumber?: string;
  status?: string;
  cargoTrackingNumber?: string;
  cargoProviderName?: string;
  shipmentAddress?: {
    firstName?: string;
    lastName?: string;
    city?: string;
    district?: string;
    address1?: string;
    addressDetail?: string;
    phoneNumber?: string;
  };
  lines?: IntegrationOrderLine[];
  grossAmount?: number;
  totalDiscount?: number;
  totalPrice?: number;
};

type IntegrationOrdersResponse = {
  content: IntegrationShipmentPackage[];
  totalPages: number;
  page: number;
};

function mapPackage(pkg: IntegrationShipmentPackage): TrendyolPackage {
  const addr = pkg.shipmentAddress || {};
  return {
    orderNumber: String(pkg.orderNumber || ""),
    grossAmount: pkg.grossAmount || 0,
    totalDiscount: pkg.totalDiscount || 0,
    totalPrice: pkg.totalPrice || 0,
    status: pkg.status || "",
    shipmentAddress: {
      firstName: addr.firstName || "",
      lastName: addr.lastName || "",
      city: addr.city || "",
      district: addr.district || "",
      address1: addr.address1 || addr.addressDetail || "",
      phoneNumber: addr.phoneNumber || "",
      addressDetail: addr.addressDetail || addr.address1 || "",
    },
    lines: (pkg.lines || []).map((line) => ({
      productName: line.productName || "Ürün",
      barcode: line.barcode || line.merchantSku || line.sku || "",
      quantity: line.quantity || 1,
      price: line.price || line.amount || 0,
      amount: line.amount || line.price || 0,
    })),
    cargoTrackingNumber: pkg.cargoTrackingNumber ? String(pkg.cargoTrackingNumber) : "",
    cargoProviderName: pkg.cargoProviderName || "",
  };
}

export async function fetchTrendyolIntegrationPackages(
  credentials: TrendyolConnectionCredentials,
  lastSyncAt?: Date | null
): Promise<TrendyolPackage[]> {
  const startDate = lastSyncAt
    ? lastSyncAt.getTime()
    : Date.now() - 14 * 24 * 60 * 60 * 1000;
  const endDate = Date.now();

  const all: TrendyolPackage[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore && page < 10) {
    const query = new URLSearchParams({
      startDate: String(startDate),
      endDate: String(endDate),
      page: String(page),
      size: "200",
      orderByField: "PackageLastModifiedDate",
      orderByDirection: "DESC",
    });

    const url = `${INTEGRATION_ORDER_BASE}/${credentials.sellerId}/orders?${query}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${basicAuth(credentials.apiKey, credentials.apiSecret)}`,
        "User-Agent": `${credentials.sellerId} - SelfIntegration`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Trendyol integration orders ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as IntegrationOrdersResponse;
    const batch = (json.content || []).map(mapPackage).filter((p) => p.orderNumber);
    all.push(...batch);
    hasMore = page < (json.totalPages || 1) - 1;
    page++;
  }

  return all;
}

export async function fetchTrendyolOrderByNumber(
  credentials: TrendyolConnectionCredentials,
  orderNumber: string
): Promise<TrendyolPackage | null> {
  const query = new URLSearchParams({
    orderNumber,
    size: "1",
    page: "0",
  });
  const url = `${INTEGRATION_ORDER_BASE}/${credentials.sellerId}/orders?${query}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${basicAuth(credentials.apiKey, credentials.apiSecret)}`,
      "User-Agent": `${credentials.sellerId} - SelfIntegration`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as IntegrationOrdersResponse;
  const pkg = json.content?.[0];
  return pkg ? mapPackage(pkg) : null;
}
