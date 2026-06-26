import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/auth/admin-access";
import { moduleKeyLookupVariants, normalizeModuleKey } from "./module-key";

export const MODULE_KEYS = ["ENA_COMMERCE", "THYRONIX", "HIVE", "HIVE_PRO", "LINKSLASH", "POD_CREATOR", "AI_PAGE_FACTORY", "AI_DROPSHIP"] as const;
export type ModuleKey = typeof MODULE_KEYS[number];

export async function getDealerModuleLicense(dealerId: string, moduleKey: string) {
  const normalized = normalizeModuleKey(moduleKey);
  const licenses = await prisma.moduleLicense.findMany({
    where: { dealerId, moduleKey: { in: moduleKeyLookupVariants(normalized) } },
    orderBy: { createdAt: "desc" },
  });
  if (!licenses.length) return null;
  // Önce geçerli (entitled) lisansı bul — yeni PENDING kayıt eski ACTIVE lisansı gölgelemesin
  const entitled = licenses.find((l) => isModuleLicenseEntitled(l));
  return entitled || licenses[0];
}

/** Geçerli modül lisansı — admin grant dahil; ENA_COMMERCE hariç bayi onayına bağlı değil */
export function isModuleLicenseEntitled(
  license: { status: string; lifecycleStage: string; endsAt: Date | null; trialEndsAt?: Date | null },
  now = new Date()
): boolean {
  if (["blocked", "purged"].includes(license.lifecycleStage)) return false;
  if (license.status === "TRIAL" && license.trialEndsAt && license.trialEndsAt < now) return false;
  if (license.endsAt && license.endsAt < now) return false;
  if (["expired", "passive"].includes(license.lifecycleStage)) return false;
  if (["SUSPENDED", "EXPIRED", "CANCELLED"].includes(license.status)) return false;
  return license.status === "ACTIVE" || license.status === "TRIAL";
}

export type ModuleAccessContext = { userRole?: string | null };

export async function hasModuleAccess(
  dealerId: string,
  moduleKey: string,
  ctx?: ModuleAccessContext
): Promise<boolean> {
  if (isSuperAdmin(ctx?.userRole || undefined)) return true;
  const state = await getModuleLicenseState(dealerId, moduleKey, ctx);
  return state === "active";
}

export type ModuleLicenseState = "active" | "pending" | "none";

export async function getModuleLicenseState(
  dealerId: string,
  moduleKey: string,
  ctx?: ModuleAccessContext
): Promise<ModuleLicenseState> {
  const key = normalizeModuleKey(moduleKey);
  if (isSuperAdmin(ctx?.userRole || undefined)) return "active";
  if (key === "ENA_COMMERCE") {
    const approval = await prisma.dealerApproval.findUnique({ where: { dealerId } });
    return approval?.status === "ACTIVE" ? "active" : approval ? "pending" : "none";
  }

  const license = await getDealerModuleLicense(dealerId, key);
  if (!license) return "none";

  if (key === "POD_CREATOR") {
    if (!license) return "none";
    if (license.status === "PENDING_PAYMENT" || license.status === "PENDING_APPROVAL") return "pending";
    if (isModuleLicenseEntitled(license)) return "active";
    return "none";
  }

  if (isModuleLicenseEntitled(license)) return "active";
  if (license.status === "PENDING_PAYMENT" || license.status === "PENDING_APPROVAL") return "pending";

  return "none";
}

export async function getDealerApprovalStatus(dealerId: string) {
  return prisma.dealerApproval.findUnique({ where: { dealerId } });
}

export async function canDealerPurchaseModule(dealerId: string): Promise<boolean> {
  const approval = await prisma.dealerApproval.findUnique({ where: { dealerId } });
  return approval?.status === "ACTIVE";
}

export async function getAvailablePlans(moduleKey: string) {
  return prisma.modulePlan.findMany({
    where: { moduleKey: normalizeModuleKey(moduleKey), isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function getModuleLabel(key: string): string {
  const labels: Record<string, string> = {
    ENA_COMMERCE: "ENA Ticaret",
    THYRONIX: "THYRONIX",
    HIVE: "HIVE",
    HIVE_PRO: "HIVE Pro",
    LINKSLASH: "LinkSlash",
    POD_CREATOR: "POD Creator",
    AI_PAGE_FACTORY: "AI Page Factory",
    AI_DROPSHIP: "ENA Dropship",
    PRODUCT_LIBRARY: "Hazır Ürün Deposu",
  };
  return labels[key] || key;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    INACTIVE: "Pasif",
    TRIAL: "Deneme",
    PENDING_PAYMENT: "Ödeme Bekliyor",
    PENDING_APPROVAL: "Onay Bekliyor",
    ACTIVE: "Aktif",
    SUSPENDED: "Askıya Alındı",
    CANCELLED: "İptal Edildi",
    EXPIRED: "Süresi Doldu",
  };
  return labels[status] || status;
}
