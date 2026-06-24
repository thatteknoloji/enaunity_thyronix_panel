import type { UnifiedStatus } from "@/lib/customer-products/types";
import { getDealerModuleLicense, getModuleLicenseState } from "./access";
import { MARKETPLACE_MODULES, MARKETPLACE_MODULE_KEYS, type MarketplaceCard, resolveMarketplaceCta } from "./marketplace";

export async function buildMarketplaceCard(
  dealerId: string,
  key: (typeof MARKETPLACE_MODULE_KEYS)[number],
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
        statusLabel: "Yakında",
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

  const statusLabels: Record<MarketplaceCard["displayStatus"], string> = {
    ACTIVE: "Aktif",
    TRIAL: "Deneme",
    EXPIRED: "Süresi dolmuş",
    PURCHASABLE: "Satın alınabilir",
    PENDING: "Admin onayı gerekli",
    ADMIN_ONLY: "Özel teklif",
    COMING_SOON: "Yakında",
  };

  return {
    moduleKey: key,
    label: meta.label,
    description: meta.description,
    displayStatus,
    statusLabel: statusLabels[displayStatus],
    planKey: product?.planKey || license?.planKey || null,
    planName: product?.planName || license?.planKey || null,
    endsAt: license?.endsAt?.toISOString() || null,
    ctaLabel,
    ctaHref,
    canEnter,
    licensed: licenseState === "active",
  };
}

export async function getDealerMarketplaceOverview(
  dealerId: string,
  products?: Array<{ moduleKey: string; status: UnifiedStatus; rawStatus: string; planKey: string | null; planName: string | null }>
) {
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
