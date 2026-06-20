import { prisma } from "@/lib/db";

export const MODULE_KEYS = ["ENA_COMMERCE", "THYRONIX", "HIVE", "HIVE_PRO"] as const;
export type ModuleKey = typeof MODULE_KEYS[number];

export async function getDealerModuleLicense(dealerId: string, moduleKey: string) {
  return prisma.moduleLicense.findFirst({ where: { dealerId, moduleKey }, orderBy: { createdAt: "desc" } });
}

export async function hasModuleAccess(dealerId: string, moduleKey: string): Promise<boolean> {
  const state = await getModuleLicenseState(dealerId, moduleKey);
  return state === "active";
}

export type ModuleLicenseState = "active" | "pending" | "none";

export async function getModuleLicenseState(dealerId: string, moduleKey: string): Promise<ModuleLicenseState> {
  if (moduleKey === "ENA_COMMERCE") {
    const approval = await prisma.dealerApproval.findUnique({ where: { dealerId } });
    return approval?.status === "ACTIVE" ? "active" : approval ? "pending" : "none";
  }

  const approval = await prisma.dealerApproval.findUnique({ where: { dealerId } });
  if (!approval || approval.status !== "ACTIVE") return "pending";

  const license = await getDealerModuleLicense(dealerId, moduleKey);
  if (!license) return "none";

  const now = new Date();
  if (["blocked", "purged"].includes(license.lifecycleStage)) return "none";
  if (license.endsAt && license.endsAt < now) return "none";
  if (["expired", "passive"].includes(license.lifecycleStage)) return "none";
  if (license.status === "SUSPENDED" || license.status === "EXPIRED" || license.status === "CANCELLED") return "none";

  if (license.status === "ACTIVE" || license.status === "TRIAL") return "active";
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
  return prisma.modulePlan.findMany({ where: { moduleKey, isActive: true }, orderBy: { sortOrder: "asc" } });
}

export function getModuleLabel(key: string): string {
  const labels: Record<string, string> = {
    ENA_COMMERCE: "ENA Ticaret",
    THYRONIX: "THYRONIX",
    HIVE: "HIVE",
    HIVE_PRO: "HIVE Pro",
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
