import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/auth/admin-access";
import {
  getDealerModuleLicense,
  getModuleLicenseState,
  isModuleLicenseEntitled,
} from "@/lib/modules/access";
import { parsePodPlanLimits } from "./plans";

export const POD_MODULE_KEY = "POD_CREATOR";

export type PodAccessResult = {
  allowed: boolean;
  reason?: string;
  code?: "AUTH_REQUIRED" | "DEALER_REQUIRED" | "DEALER_INACTIVE" | "LISANS_YOK" | "LISANS_BEKLIYOR" | "LISANS_SURESI_DOLDU";
  redirectTo?: string;
};

export type PodLicenseStatus = {
  hasLicense: boolean;
  licenseState: "active" | "pending" | "none";
  planKey: string | null;
  limits: Record<string, number> | null;
  featureStatus: "COMING_SOON";
  endsAt: string | null;
};

type UserLike = {
  role: string;
  dealerId?: string | null;
};

export async function validatePodDealerContext(dealerId: string): Promise<{
  ok: boolean;
  code?: "DEALER_INACTIVE" | "DEALER_REQUIRED" | "BAYI_ONAYI_YOK";
}> {
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: { status: true },
  });
  if (!dealer || dealer.status !== "ACTIVE") {
    return { ok: false, code: "DEALER_INACTIVE" };
  }

  const approval = await prisma.dealerApproval.findUnique({ where: { dealerId } });
  if (!approval || approval.status !== "ACTIVE") {
    return { ok: false, code: "BAYI_ONAYI_YOK" };
  }

  return { ok: true };
}

export async function isPodPlanEntitled(planKey: string | null | undefined): Promise<boolean> {
  if (!planKey) return false;
  const plan = await prisma.modulePlan.findFirst({
    where: { moduleKey: POD_MODULE_KEY, planKey },
  });
  if (!plan || !plan.isActive) return false;
  return true;
}

export async function assertPodCreatorAccess(user: UserLike | null): Promise<PodAccessResult> {
  if (!user) {
    return { allowed: false, reason: "Giriş yapmalısınız", code: "AUTH_REQUIRED" };
  }

  if (isAdminRole(user.role)) {
    return { allowed: true };
  }

  if (!user.dealerId) {
    return {
      allowed: false,
      reason: "POD Creator için bayi hesabı gerekli",
      code: "DEALER_REQUIRED",
      redirectTo: "/is-ortakligi",
    };
  }

  const ctx = await validatePodDealerContext(user.dealerId);
  if (!ctx.ok) {
    if (ctx.code === "BAYI_ONAYI_YOK") {
      return {
        allowed: false,
        reason: "Bayi onayınız tamamlanmadan POD Creator erişilemez",
        code: "LISANS_BEKLIYOR",
        redirectTo: "/dealer/profile",
      };
    }
    return {
      allowed: false,
      reason: "Bayi hesabınız aktif değil",
      code: "DEALER_INACTIVE",
      redirectTo: "/is-ortakligi",
    };
  }

  const license = await getDealerModuleLicense(user.dealerId, POD_MODULE_KEY);
  if (license && !isModuleLicenseEntitled(license)) {
    const expired =
      license.status === "EXPIRED" ||
      license.lifecycleStage === "expired" ||
      (license.endsAt && license.endsAt < new Date());
    if (expired) {
      return {
        allowed: false,
        reason: "POD Creator lisans süreniz dolmuş",
        code: "LISANS_SURESI_DOLDU",
        redirectTo: "/payment/checkout?type=module&moduleKey=POD_CREATOR&planKey=starter",
      };
    }
  }

  const state = await getModuleLicenseState(user.dealerId, POD_MODULE_KEY);
  if (state === "none") {
    return {
      allowed: false,
      reason: "POD Creator lisansı bulunamadı",
      code: "LISANS_YOK",
      redirectTo: "/gateway/pod",
    };
  }
  if (state === "pending") {
    return {
      allowed: false,
      reason: "POD Creator lisansınız onay veya ödeme bekliyor",
      code: "LISANS_BEKLIYOR",
      redirectTo: "/gateway/pod",
    };
  }

  const entitledPlan = await isPodPlanEntitled(license?.planKey);
  if (license?.planKey && !entitledPlan) {
    return {
      allowed: false,
      reason: "POD Creator planınız artık aktif değil",
      code: "LISANS_YOK",
      redirectTo: "/gateway/pod",
    };
  }

  return { allowed: true };
}

export async function resolvePodGatewayState(user: UserLike) {
  if (!user || (!user.dealerId && !isAdminRole(user.role))) {
    if (!user) return { step: "auth_required" as const };
    return { step: "dealer_required" as const, reason: "POD Creator için bayi hesabı gerekli", redirectTo: "/is-ortakligi" };
  }

  if (isAdminRole(user.role)) {
    return { step: "ready" as const, redirectTo: "/dealer/pod" };
  }

  const access = await assertPodCreatorAccess(user);
  if (!access.allowed) {
    if (access.code === "LISANS_SURESI_DOLDU") {
      return {
        step: "expired" as const,
        reason: access.reason,
        redirectTo: access.redirectTo,
      };
    }
    if (access.code === "LISANS_YOK") {
      return {
        step: "pricing" as const,
        reason: access.reason,
        redirectTo: "/payment/checkout?type=module&moduleKey=POD_CREATOR&planKey=starter",
      };
    }
    if (access.code === "LISANS_BEKLIYOR") {
      return { step: "pending" as const, reason: access.reason };
    }
    if (access.code === "DEALER_REQUIRED" || access.code === "DEALER_INACTIVE") {
      return { step: "dealer_required" as const, reason: access.reason, redirectTo: access.redirectTo };
    }
    return { step: "auth_required" as const, reason: access.reason };
  }

  return { step: "ready" as const, redirectTo: "/dealer/pod" };
}

export async function getPodLicenseStatus(dealerId: string): Promise<PodLicenseStatus> {
  const licenseState = await getModuleLicenseState(dealerId, POD_MODULE_KEY);
  const license = await getDealerModuleLicense(dealerId, POD_MODULE_KEY);

  let limits: Record<string, number> | null = null;
  if (license?.planKey) {
    const plan = await prisma.modulePlan.findFirst({
      where: { moduleKey: POD_MODULE_KEY, planKey: license.planKey },
    });
    if (plan) {
      const parsed = parsePodPlanLimits(plan.limitsJson);
      limits = {
        maxDesigns: parsed.maxDesigns,
        maxProducts: parsed.maxProducts,
        maxMockups: parsed.maxMockups,
      };
    }
  }

  return {
    hasLicense: licenseState === "active",
    licenseState,
    planKey: license?.planKey || null,
    limits,
    featureStatus: "COMING_SOON",
    endsAt: license?.endsAt?.toISOString() || null,
  };
}
