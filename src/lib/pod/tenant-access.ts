import { isAdminRole } from "@/lib/auth/admin-access";

type UserLike = { role: string; dealerId?: string | null };

export function getPodDealerFilter(user: UserLike): { dealerId?: string } | Record<string, never> {
  if (isAdminRole(user.role)) return {};
  if (!user.dealerId) throw new Error("Bayi hesabı gerekli");
  return { dealerId: user.dealerId };
}

export function assertPodResourceOwner(
  resourceDealerId: string | null | undefined,
  user: UserLike
) {
  if (isAdminRole(user.role)) return;
  if (!user.dealerId || resourceDealerId !== user.dealerId) {
    throw new Error("Bu kayda erişim yetkiniz yok");
  }
}
