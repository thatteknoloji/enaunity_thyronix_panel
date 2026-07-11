import { isAdminRole } from "@/lib/auth/admin-access";
import { getDealerApprovalStatus, getModuleLicenseState } from "@/lib/modules/access";

export const PAGE_FACTORY_MODULE_KEY = "AI_PAGE_FACTORY";

export type PageFactoryAccessResult = {
  allowed: boolean;
  reason?: string;
  code?: "AUTH_REQUIRED" | "DEALER_REQUIRED" | "LISANS_YOK" | "LISANS_BEKLIYOR" | "BAYI_ONAYI_YOK";
};

type UserLike = { role: string; dealerId?: string | null };

export async function assertPageFactoryAccess(user: UserLike | null): Promise<PageFactoryAccessResult> {
  if (!user) {
    return { allowed: false, reason: "Giriş yapmalısınız", code: "AUTH_REQUIRED" };
  }

  if (isAdminRole(user.role)) {
    return { allowed: true };
  }

  if (!user.dealerId) {
    return { allowed: false, reason: "AI Page Factory için bayi hesabı gerekli", code: "DEALER_REQUIRED" };
  }

  const approval = await getDealerApprovalStatus(user.dealerId);
  if (!approval || approval.status !== "ACTIVE") {
    return {
      allowed: false,
      reason: "Bayi onayınız tamamlanmadan erişilemez",
      code: "BAYI_ONAYI_YOK",
    };
  }

  const state = await getModuleLicenseState(user.dealerId, PAGE_FACTORY_MODULE_KEY);
  if (state === "none") {
    return { allowed: false, reason: "AI Page Factory lisansı bulunamadı", code: "LISANS_YOK" };
  }
  if (state === "pending") {
    return { allowed: false, reason: "Lisans onay veya ödeme bekliyor", code: "LISANS_BEKLIYOR" };
  }

  return { allowed: true };
}
