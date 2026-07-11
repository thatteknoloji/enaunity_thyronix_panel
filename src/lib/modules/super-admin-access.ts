import { isSuperAdmin } from "@/lib/auth/admin-access";
import {
  MARKETPLACE_MODULE_KEYS,
  MARKETPLACE_MODULES,
  type MarketplaceCard,
} from "./marketplace";

/** Süper admin tüm modüllere lisans/onay olmadan erişir */
export function superAdminBypassesModules(role?: string | null): boolean {
  return isSuperAdmin(role || undefined);
}

export function buildSuperAdminMarketplaceOverview(): {
  modules: MarketplaceCard[];
  activeModules: MarketplaceCard[];
} {
  const modules: MarketplaceCard[] = MARKETPLACE_MODULE_KEYS.map((key) => {
    const meta = MARKETPLACE_MODULES[key];
    return {
      moduleKey: key,
      label: meta.label,
      description: meta.description,
      displayStatus: "ACTIVE",
      statusLabel: "Aktif",
      planKey: "super-admin",
      planName: "Süper Admin",
      endsAt: null,
      ctaLabel: "Modüle Git",
      ctaHref: key === "POD_CREATOR" || key === "AI_PAGE_FACTORY" ? meta.appPath : meta.gatewayPath,
      canEnter: true,
      licensed: true,
    };
  });
  return { modules, activeModules: modules };
}
