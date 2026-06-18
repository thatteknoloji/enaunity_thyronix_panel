export const PRODUCT_TYPES = ["THYRONIX", "HIVE"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const LINK_STATUSES = ["PENDING", "LINKED", "DISABLED", "DELETED"] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

export const PRODUCT_LOGIN_PATHS: Record<ProductType, string> = {
  THYRONIX: "/thyronix/login",
  HIVE: "/hive/login",
};

export const PRODUCT_GATEWAY_PATHS: Record<ProductType, string> = {
  THYRONIX: "/gateway/thyronix",
  HIVE: "/gateway/hive",
};

export const PRODUCT_LABELS: Record<ProductType, string> = {
  THYRONIX: "THYRONIX",
  HIVE: "HIVE",
};

export interface ProductLinkMetadata {
  ssoProvider?: string;
  ssoSubject?: string;
  createdFrom?: "gateway" | "admin" | "api";
  tempPasswordIssued?: boolean;
  [key: string]: unknown;
}
