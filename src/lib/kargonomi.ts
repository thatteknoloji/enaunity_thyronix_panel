const BASE_URL = "https://app.kargonomi.com.tr/api/v1";

export interface KargoBalance {
  balance: number;
  credit: number;
  currency: string;
}

export interface KargoAddress {
  id: number;
  name: string;
  phone: string;
  email?: string;
  countryId: number;
  stateId: number;
  cityId: number;
  address: string;
  postalCode?: string;
}

export interface KargoPackage {
  desi: number;
  weight: number;
  width: number;
  height: number;
  length: number;
  barcode?: string;
}

export interface CreateShipmentInput {
  senderId: number;
  senderAddress: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverStateId: number;
  receiverCityId: number;
  receiverCountryId: number;
  packages: KargoPackage[];
  carrierId: string;
  carrierCode?: string;
  isCod?: boolean;
  codAmount?: number;
  codType?: "CASH" | "CREDIT_CARD" | "TRANSFER";
  description?: string;
  referenceNumber?: string;
}

export interface Shipment {
  id: number;
  referenceNumber: string;
  status: string;
  carrierName: string;
  carrierCode: string;
  barcode: string;
  createdAt: string;
  isCod: boolean;
  codAmount: number | null;
  shipmentFee: number;
  totalCost: number;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  description: string | null;
  packages: KargoPackage[];
}

export interface ShipmentFilter {
  page?: number;
  size?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  referenceNumber?: string;
  carrierId?: string;
}

export interface PriceComparison {
  carrierCode: string;
  carrierName: string;
  price: number;
  estimatedDeliveryDays: number;
  isCod: boolean;
  codFee: number | null;
}

export interface Carrier {
  id: string;
  code: string;
  name: string;
  logo: string;
}

export interface Warehouse {
  id: number;
  name: string;
  address: string;
  stateId: number;
  cityId: number;
  countryId: number;
  phone: string;
}

export interface State {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
}

export interface Webhook {
  id: number;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

function getConfig() {
  const token = process.env.KARGONOMI_API_TOKEN;
  const appKey = process.env.KARGONOMI_APP_KEY;
  if (!token) throw new Error("KARGONOMI_API_TOKEN is not configured");
  return { token, appKey };
}

async function fetchKG<T>(path: string, options?: RequestInit): Promise<T> {
  const { token, appKey } = getConfig();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (appKey) headers["X-App-Key"] = appKey;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kargonomi API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const kargonomi = {
  getBalance: () => fetchKG<KargoBalance>("/user/credit"),

  getCarriers: () => fetchKG<Carrier[]>("/carriers"),

  listShipments: (filter?: ShipmentFilter) => {
    const params = new URLSearchParams();
    if (filter) {
      if (filter.page) params.set("page", String(filter.page));
      if (filter.size) params.set("size", String(filter.size));
      if (filter.status) params.set("status", filter.status);
      if (filter.startDate) params.set("startDate", filter.startDate);
      if (filter.endDate) params.set("endDate", filter.endDate);
      if (filter.referenceNumber) params.set("referenceNumber", filter.referenceNumber);
      if (filter.carrierId) params.set("carrierId", filter.carrierId);
    }
    const qs = params.toString();
    return fetchKG<{ items: Shipment[]; total: number; page: number; size: number }>(`/shipments${qs ? "?" + qs : ""}`);
  },

  getShipment: (id: number) => fetchKG<Shipment>(`/shipments/${id}`),

  createShipment: (input: CreateShipmentInput) =>
    fetchKG<Shipment>("/shipments", { method: "POST", body: JSON.stringify(input) }),

  updateShipment: (id: number, input: Partial<CreateShipmentInput>) =>
    fetchKG<Shipment>(`/shipments/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  patchShipment: (id: number, input: Partial<CreateShipmentInput>) =>
    fetchKG<Shipment>(`/shipments/${id}`, { method: "PATCH", body: JSON.stringify(input) }),

  deleteShipment: (id: number) =>
    fetchKG<{ success: boolean }>(`/shipments/${id}`, { method: "DELETE" }),

  confirmShippingPrice: (id: number) =>
    fetchKG<Shipment>("/confirm-shipping-price", { method: "POST", body: JSON.stringify({ id }) }),

  cancelShipment: (id: number, reason?: string) =>
    fetchKG<{ success: boolean }>("/shipments/cancel", {
      method: "POST",
      body: JSON.stringify({ id, reason }),
    }),

  getBarcodeUrl: (id: number) => `${BASE_URL}/shipments/${id}/barcode`,

  getPriceComparison: (id: number) =>
    fetchKG<PriceComparison[]>(`/shipment-price-comparison/${id}`),

  listWarehouses: () => fetchKG<Warehouse[]>("/warehouses"),

  createWarehouse: (input: Omit<Warehouse, "id">) =>
    fetchKG<Warehouse>("/warehouses", { method: "POST", body: JSON.stringify(input) }),

  getStates: (countryId?: number) => {
    const path = countryId ? `/states/${countryId}` : "/states";
    return fetchKG<State[]>(path);
  },

  getCities: (stateId: number) => fetchKG<City[]>(`/cities/${stateId}`),

  listWebhooks: () => fetchKG<Webhook[]>("/webhooks"),

  createWebhook: (input: { url: string; events: string[]; secret?: string }) =>
    fetchKG<Webhook>("/webhooks", { method: "POST", body: JSON.stringify(input) }),

  updateWebhook: (id: number, input: { url?: string; events?: string[]; isActive?: boolean }) =>
    fetchKG<Webhook>(`/webhooks/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  deleteWebhook: (id: number) =>
    fetchKG<{ success: boolean }>(`/webhooks/${id}`, { method: "DELETE" }),
};
