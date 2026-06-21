import type { LucideIcon } from "lucide-react";
import { Package, Sparkles, Link2, Shirt, Layers } from "lucide-react";
import type { UnifiedStatus } from "@/lib/customer-products/types";
import { PRODUCT_META, type CustomerProductKey } from "@/lib/customer-products/types";
import { getModuleLicenseState, getDealerModuleLicense } from "./access";

/** Modül Pazarı'nda listelenen premium modüller */
export const MARKETPLACE_MODULE_KEYS = ["LINKSLASH", "HIVE", "THYRONIX", "POD_CREATOR", "AI_PAGE_FACTORY"] as const;
export type MarketplaceModuleKey = (typeof MARKETPLACE_MODULE_KEYS)[number];

export type MarketplaceModuleMeta = {
  moduleKey: MarketplaceModuleKey;
  label: string;
  description: string;
  color: string;
  appPath: string;
  gatewayPath: string;
  marketingPath: string;
  checkoutPath: string;
  icon: LucideIcon;
};

export const MARKETPLACE_MODULES: Record<MarketplaceModuleKey, MarketplaceModuleMeta> = {
  LINKSLASH: {
    moduleKey: "LINKSLASH",
    label: "LinkSlash",
    description: "AI destekli kişisel link kütüphanesi ve WhatsApp import",
    color: "cyan",
    appPath: "/dealer/linkslash",
    gatewayPath: "/gateway/linkslash",
    marketingPath: "/platform/linkslash",
    checkoutPath: "/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter",
    icon: Link2,
  },
  HIVE: {
    moduleKey: "HIVE",
    label: "HIVE",
    description: "SEO, GEO ve büyüme motoru",
    color: "violet",
    appPath: "/hive",
    gatewayPath: "/gateway/hive",
    marketingPath: "/platform/hive",
    checkoutPath: "/payment/checkout?type=module&moduleKey=HIVE&planKey=starter",
    icon: Sparkles,
  },
  THYRONIX: {
    moduleKey: "THYRONIX",
    label: "Thyronix",
    description: "Ürün feed yönetimi ve AI optimizasyonu",
    color: "blue",
    appPath: "/thyronix",
    gatewayPath: "/gateway/thyronix",
    marketingPath: "/platform/thyronix",
    checkoutPath: "/payment/checkout?type=module&moduleKey=THYRONIX&planKey=starter",
    icon: Package,
  },
  POD_CREATOR: {
    moduleKey: "POD_CREATOR",
    label: "POD Creator",
    description:
      "Kendi tasarımlarını ürüne dönüştür, satış ve kazançlarını takip et. Tasarımdan ürüne çalışan POD altyapısı yakında aktif.",
    color: "emerald",
    appPath: "/dealer/pod",
    gatewayPath: "/gateway/pod",
    marketingPath: "/dealer/modules",
    checkoutPath: "/payment/checkout?type=module&moduleKey=POD_CREATOR&planKey=starter",
    icon: Shirt,
  },
  AI_PAGE_FACTORY: {
    moduleKey: "AI_PAGE_FACTORY",
    label: "AI Page Factory",
    description: "Sayfa evreni planlama — topology, cluster, blueprint (içerik üretmez)",
    color: "violet",
    appPath: "/dealer/page-factory",
    gatewayPath: "/gateway/page-factory",
    marketingPath: "/platform/page-factory",
    checkoutPath: "/payment/checkout?type=module&moduleKey=AI_PAGE_FACTORY&planKey=starter",
    icon: Layers,
  },
};

export type MarketplaceDisplayStatus =
  | "ACTIVE"
  | "TRIAL"
  | "EXPIRED"
  | "PURCHASABLE"
  | "PENDING"
  | "ADMIN_ONLY"
  | "COMING_SOON";

export type MarketplaceCard = {
  moduleKey: MarketplaceModuleKey;
  label: string;
  description: string;
  displayStatus: MarketplaceDisplayStatus;
  statusLabel: string;
  planKey: string | null;
  planName: string | null;
  endsAt: string | null;
  ctaLabel: string;
  ctaHref: string;
  canEnter: boolean;
  licensed: boolean;
};

const STATUS_LABELS: Record<MarketplaceDisplayStatus, string> = {
  ACTIVE: "Aktif",
  TRIAL: "Deneme",
  EXPIRED: "Süresi dolmuş",
  PURCHASABLE: "Satın alınabilir",
  PENDING: "Admin onayı gerekli",
  ADMIN_ONLY: "Özel teklif",
  COMING_SOON: "Yakında",
};

function resolveEnterPath(key: MarketplaceModuleKey, meta: MarketplaceModuleMeta): string {
  return meta.gatewayPath;
}

export function resolveMarketplaceCta(
  key: MarketplaceModuleKey,
  licenseState: "active" | "pending" | "none",
  unifiedStatus: UnifiedStatus,
  rawStatus: string | null
): { ctaLabel: string; ctaHref: string; canEnter: boolean; displayStatus: MarketplaceDisplayStatus } {
  const meta = MARKETPLACE_MODULES[key];
  const enterPath = resolveEnterPath(key, meta);

  if (licenseState === "active") {
    return {
      ctaLabel: "Modüle Git",
      ctaHref: key === "POD_CREATOR" ? meta.appPath : enterPath,
      canEnter: true,
      displayStatus: unifiedStatus === "TRIAL" ? "TRIAL" : "ACTIVE",
    };
  }

  if (unifiedStatus === "EXPIRED" || rawStatus === "EXPIRED") {
    return {
      ctaLabel: "Yenile",
      ctaHref: meta.checkoutPath,
      canEnter: false,
      displayStatus: "EXPIRED",
    };
  }

  if (licenseState === "pending" || unifiedStatus === "PENDING") {
    const pendingHref =
      key === "POD_CREATOR"
        ? "/gateway/pod"
        : key === "THYRONIX"
          ? "/thyronix/pending"
          : key === "HIVE"
            ? "/hive/pending"
            : meta.checkoutPath;
    return {
      ctaLabel: key === "POD_CREATOR" ? "Ödeme / Onay" : "Başvuru Yap",
      ctaHref: pendingHref,
      canEnter: false,
      displayStatus: "PENDING",
    };
  }

  return {
    ctaLabel: "Satın Al",
    ctaHref: meta.checkoutPath,
    canEnter: false,
    displayStatus: "PURCHASABLE",
  };
}

export async function buildMarketplaceCard(
  dealerId: string,
  key: MarketplaceModuleKey,
  product?: {
    status: UnifiedStatus;
    rawStatus: string;
    planKey: string | null;
    planName: string | null;
  }
): Promise<MarketplaceCard> {
  const meta = MARKETPLACE_MODULES[key];
  const licenseState = await getModuleLicenseState(dealerId, key);
  const license = await getDealerModuleLicense(dealerId, key);

  const unifiedStatus = product?.status || "INACTIVE";
  const rawStatus = product?.rawStatus || license?.status || null;

  if (key === "POD_CREATOR" && licenseState === "none" && unifiedStatus !== "EXPIRED" && rawStatus !== "EXPIRED") {
    const { getPublicPodPlans } = await import("@/lib/pod/plans");
    const publicPlans = await getPublicPodPlans();
    if (publicPlans.length === 0) {
      return {
        moduleKey: key,
        label: meta.label,
        description: meta.description,
        displayStatus: "COMING_SOON",
        statusLabel: STATUS_LABELS.COMING_SOON,
        planKey: null,
        planName: null,
        endsAt: null,
        ctaLabel: "Lisans Al",
        ctaHref: "/gateway/pod",
        canEnter: false,
        licensed: false,
      };
    }
  }

  const { ctaLabel, ctaHref, canEnter, displayStatus } = resolveMarketplaceCta(
    key,
    licenseState,
    unifiedStatus,
    rawStatus
  );

  return {
    moduleKey: key,
    label: meta.label,
    description: meta.description,
    displayStatus,
    statusLabel: STATUS_LABELS[displayStatus],
    planKey: product?.planKey || license?.planKey || null,
    planName: product?.planName || license?.planKey || null,
    endsAt: license?.endsAt?.toISOString() || null,
    ctaLabel,
    ctaHref,
    canEnter,
    licensed: licenseState === "active",
  };
}

export async function getDealerMarketplaceOverview(dealerId: string, products?: Array<{ moduleKey: string; status: UnifiedStatus; rawStatus: string; planKey: string | null; planName: string | null }>) {
  const productMap = Object.fromEntries((products || []).map((p) => [p.moduleKey, p]));

  const modules = await Promise.all(
    MARKETPLACE_MODULE_KEYS.map((key) =>
      buildMarketplaceCard(dealerId, key, productMap[key] as never)
    )
  );

  return {
    modules,
    activeModules: modules.filter((m) => m.canEnter),
  };
}

/** Header / menü: lisanslı → gateway, lisanssız → tanıtım sayfası */
export function resolveModuleNavHref(card: Pick<MarketplaceCard, "moduleKey" | "licensed" | "displayStatus">): string {
  const meta = MARKETPLACE_MODULES[card.moduleKey];
  if (card.licensed) return meta.gatewayPath;
  if (card.displayStatus === "PENDING") {
    if (card.moduleKey === "THYRONIX") return "/thyronix/pending";
    if (card.moduleKey === "HIVE") return "/hive/pending";
    return meta.gatewayPath;
  }
  return meta.marketingPath;
}

export function buildHeaderNavItems(modules: MarketplaceCard[]) {
  return MARKETPLACE_MODULE_KEYS.map((key) => {
    const card = modules.find((m) => m.moduleKey === key);
    const meta = MARKETPLACE_MODULES[key];
    const stub: Pick<MarketplaceCard, "moduleKey" | "licensed" | "displayStatus"> = card || {
      moduleKey: key,
      licensed: false,
      displayStatus: "PURCHASABLE",
    };
    return {
      moduleKey: key,
      label: meta.label,
      href: resolveModuleNavHref(stub),
    };
  });
}

export function buildLicensedNavItems(modules: MarketplaceCard[]) {
  return MARKETPLACE_MODULE_KEYS.map((key) => {
    const card = modules.find((m) => m.moduleKey === key);
    const meta = MARKETPLACE_MODULES[key];
    const stub: Pick<MarketplaceCard, "moduleKey" | "licensed" | "displayStatus"> = card || {
      moduleKey: key,
      licensed: false,
      displayStatus: "PURCHASABLE",
    };
    return {
      href: resolveModuleNavHref(stub),
      label: meta.label,
      icon: meta.icon,
      moduleKey: key,
    };
  });
}

/** Lisanslı premium modül giriş yolu — gateway üzerinden SSO / provisioning */
export function resolvePremiumEnterHref(moduleKey: string, licensed: boolean): string {
  const meta = MARKETPLACE_MODULES[moduleKey as MarketplaceModuleKey];
  if (!meta) {
    const productMeta = PRODUCT_META[moduleKey as CustomerProductKey];
    if (!productMeta) return "/products";
    return licensed ? productMeta.gatewayPath : productMeta.pricingPath;
  }
  return licensed ? meta.gatewayPath : meta.marketingPath;
}
