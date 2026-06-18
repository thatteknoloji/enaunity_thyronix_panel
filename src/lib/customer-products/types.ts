export const CUSTOMER_PRODUCT_KEYS = ["ENA_COMMERCE", "THYRONIX", "HIVE", "PRODUCT_LIBRARY"] as const;
export type CustomerProductKey = (typeof CUSTOMER_PRODUCT_KEYS)[number];

export const UNIFIED_STATUSES = ["ACTIVE", "TRIAL", "PENDING", "INACTIVE", "EXPIRED"] as const;
export type UnifiedStatus = (typeof UNIFIED_STATUSES)[number];

export const PRODUCT_META: Record<
  CustomerProductKey,
  { label: string; description: string; color: string; gatewayPath: string; pricingPath: string; appPath: string }
> = {
  ENA_COMMERCE: {
    label: "ENA Ticaret",
    description: "B2B ticaret, sipariş ve bayi yönetimi",
    color: "red",
    gatewayPath: "/dealer",
    pricingPath: "/is-ortakligi",
    appPath: "/dealer",
  },
  THYRONIX: {
    label: "THYRONIX",
    description: "Ürün feed yönetimi ve AI optimizasyonu",
    color: "blue",
    gatewayPath: "/gateway/thyronix",
    pricingPath: "/thyronix/pricing",
    appPath: "/thyronix",
  },
  HIVE: {
    label: "HIVE",
    description: "SEO, GEO ve büyüme motoru",
    color: "violet",
    gatewayPath: "/gateway/hive",
    pricingPath: "/hive/pricing",
    appPath: "/hive",
  },
  PRODUCT_LIBRARY: {
    label: "Hazır Ürün Deposu",
    description: "Paketli ürün katalogları, indirme ve güncelleme",
    color: "emerald",
    gatewayPath: "/product-library",
    pricingPath: "/product-library",
    appPath: "/product-library",
  },
};

export interface CustomerProductCard {
  moduleKey: CustomerProductKey;
  label: string;
  description: string;
  status: UnifiedStatus;
  rawStatus: string;
  planKey: string | null;
  planName: string | null;
  lastPaymentAt: string | null;
  lastPaymentAmount: number | null;
  lastPaymentStatus: string | null;
  lastLoginAt: string | null;
  linkStatus: string | null;
  licenseId: string | null;
  libraryStats?: {
    packageCount: number;
    activePackageCount: number;
    pendingPayments: number;
    lastDownloadAt: string | null;
    lastDownloadPackage: string | null;
  };
}

export interface CustomerProductsOverview {
  dealerId: string | null;
  dealerName: string | null;
  products: CustomerProductCard[];
}
