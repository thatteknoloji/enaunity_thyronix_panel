const BASE_URL = "https://basitkargo.com/api";

export interface CargoHandler {
  name: string;
  code: string;
  logo: string;
}

export interface CargoFee {
  desiKg: number;
  handlerCode: string;
  price: number;
  codFee: number | null;
}

export interface PackageDimension {
  height: number;
  width: number;
  depth: number;
  weight: number;
}

export interface OrderContent {
  name: string;
  code?: string;
  items?: { name: string; code?: string; quantity: string }[];
  packages: PackageDimension[];
}

export interface OrderClient {
  name: string;
  phone: string;
  city: string;
  town: string;
  address: string;
}

export interface CreateOrderInput {
  type?: "OUTGOING" | "INCOMING";
  content: OrderContent;
  client: OrderClient;
  collect?: number;
  collectOnDeliveryType?: "CASH" | "CREDIT_CARD";
  addressId?: string;
  brandId?: string;
}

export interface CreateOrderWithBarcodeInput extends CreateOrderInput {
  handlerCode: string;
}

export interface BasitOrder {
  id: string;
  barcode: string | null;
  type: string;
  status: string;
  validationFailed: boolean;
  createdTime: string;
  handler?: { name: string; code: string };
  handlerShipmentCode?: string;
  content?: OrderContent;
  client?: OrderClient;
  collect?: number;
  priceInfo?: { shipmentFee: number; totalCost: number };
  traces?: { status: string; time: string; location: string }[];
}

export interface OrderFilter {
  startDate?: string;
  endDate?: string;
  statusList?: string[];
  handlerCode?: string;
  sortBy?: string;
  page?: number;
  size?: number;
}

export interface City {
  id: number;
  name: string;
}

export interface Town {
  id: number;
  name: string;
}

export interface Neighborhood {
  id: number;
  name: string;
}

export interface Brand {
  id: string;
  name: string;
  status: string;
  logo: string;
  website: string;
  instagram: string;
  createdAt: string;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  city: string;
  town: string;
  address: string;
  type: string;
  createdTime: string;
}

function getToken(): string {
  const token = process.env.BASITKARGO_API_TOKEN;
  if (!token) throw new Error("BASITKARGO_API_TOKEN is not configured");
  return token;
}

async function fetchBK<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BasitKargo API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const basitkargo = {
  getHandlers: () => fetchBK<CargoHandler[]>("/handlers"),

  getFeeByDesi: (desiKg: number, codAmount?: number, codType?: string) => {
    let path = `/handlers/fee/desiKg/${desiKg}`;
    const params = new URLSearchParams();
    if (codAmount) params.set("codAmount", String(codAmount));
    if (codType) params.set("codType", codType);
    const qs = params.toString();
    return fetchBK<CargoFee[]>(`${path}${qs ? "?" + qs : ""}`);
  },

  getFeeByPackages: (packages: PackageDimension[]) =>
    fetchBK<CargoFee[]>("/handlers/fee/packages", {
      method: "POST",
      body: JSON.stringify(packages),
    }),

  createOrder: (input: CreateOrderInput) =>
    fetchBK<BasitOrder>("/v2/order", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createOrderWithBarcode: (input: CreateOrderWithBarcodeInput) =>
    fetchBK<BasitOrder>("/v2/order/barcode", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateOrder: (id: string, input: Partial<CreateOrderInput>) =>
    fetchBK<BasitOrder>("/v2/order", {
      method: "PUT",
      body: JSON.stringify({ id, ...input }),
    }),

  filterOrders: (filter: OrderFilter) =>
    fetchBK<{ items: BasitOrder[]; total: number; page: number; size: number }>("/v2/order/filter", {
      method: "POST",
      body: JSON.stringify(filter),
    }),

  getOrder: (id: string) => fetchBK<BasitOrder>(`/v2/order/${id}`),

  getOrderByBarcode: (barcode: string) => fetchBK<BasitOrder>(`/v2/order/barcode/${barcode}`),

  cancelBarcode: (barcode: string) => fetchBK<{ success: boolean }>(`/order/barcode/${barcode}`, { method: "DELETE" }),

  createReturn: (barcode: string) => fetchBK<BasitOrder>(`/v2/order/return/barcode/${barcode}`),

  getLabelUrl: (id: string) => `${BASE_URL}/label/svg/${id}`,

  getBalance: () => fetchBK<number>("/firm/balance"),

  getBrands: () => fetchBK<Brand[]>("/firm/brand"),

  getAddresses: () => fetchBK<Address[]>("/firm/address"),

  getCities: () => fetchBK<City[]>("/country/TR/cities"),

  getTowns: (cityId: number) => fetchBK<Town[]>(`/city/${cityId}/towns`),

  getNeighborhoods: (cityName: string, townName: string) =>
    fetchBK<Neighborhood[]>(`/city/${encodeURIComponent(cityName)}/town/${encodeURIComponent(townName)}/neigborhoods`),
};
