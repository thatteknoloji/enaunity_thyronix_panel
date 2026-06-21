export const CUSTOMER_PRODUCT_KEYS = ["ENA_COMMERCE", "THYRONIX", "HIVE", "PRODUCT_LIBRARY", "LINKSLASH", "POD_CREATOR", "AI_PAGE_FACTORY"] as const;
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
    pricingPath: "/payment/checkout?type=module&moduleKey=THYRONIX&planKey=starter",
    appPath: "/thyronix",
  },
  HIVE: {
    label: "HIVE",
    description: "SEO, GEO ve büyüme motoru",
    color: "violet",
    gatewayPath: "/gateway/hive",
    pricingPath: "/payment/checkout?type=module&moduleKey=HIVE&planKey=starter",
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
  LINKSLASH: {
    label: "LinkSlash",
    description: "AI destekli kişisel link kütüphanesi ve WhatsApp import",
    color: "cyan",
    gatewayPath: "/gateway/linkslash",
    pricingPath: "/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter",
    appPath: "/dealer/linkslash",
  },
  POD_CREATOR: {
    label: "POD Creator",
    description: "Tasarımdan ürüne POD altyapısı — tasarım ve mockup özellikleri yakında",
    color: "emerald",
    gatewayPath: "/gateway/pod",
    pricingPath: "/payment/checkout?type=module&moduleKey=POD_CREATOR&planKey=starter",
    appPath: "/dealer/pod",
  },
  AI_PAGE_FACTORY: {
    label: "AI Page Factory",
    description: "Sayfa evreni planlama — topology, cluster, blueprint",
    color: "violet",
    gatewayPath: "/gateway/page-factory",
    pricingPath: "/payment/checkout?type=module&moduleKey=AI_PAGE_FACTORY&planKey=starter",
    appPath: "/dealer/page-factory",
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
  /** getModuleLicenseState() === "active" — kart/menü giriş kararı için */
  entitled?: boolean;
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
