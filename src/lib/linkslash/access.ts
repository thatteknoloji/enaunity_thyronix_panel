import { isAdminRole } from "@/lib/auth/admin-access";
import { getModuleLicenseState } from "@/lib/modules/access";

export const LINKSLASH_MODULE_KEY = "LINKSLASH";

export type LinkSlashAccessResult = {
  allowed: boolean;
  reason?: string;
  code?: "AUTH_REQUIRED" | "DEALER_REQUIRED" | "LISANS_YOK" | "LISANS_BEKLIYOR";
};

type UserLike = {
  role: string;
  dealerId?: string | null;
};

export async function assertLinkSlashAccess(user: UserLike | null): Promise<LinkSlashAccessResult> {
  if (!user) {
    return { allowed: false, reason: "Giriş yapmalısınız", code: "AUTH_REQUIRED" };
  }

  if (isAdminRole(user.role)) {
    return { allowed: true };
  }

  if (!user.dealerId) {
    return { allowed: false, reason: "LinkSlash için bayi hesabı gerekli", code: "DEALER_REQUIRED" };
  }

  const state = await getModuleLicenseState(user.dealerId, LINKSLASH_MODULE_KEY);
  if (state === "none") {
    return { allowed: false, reason: "LinkSlash lisansı bulunamadı", code: "LISANS_YOK" };
  }
  if (state === "pending") {
    return { allowed: false, reason: "LinkSlash lisansınız onay veya ödeme bekliyor", code: "LISANS_BEKLIYOR" };
  }

  return { allowed: true };
}
