import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/auth/admin-access";
import { getModuleLicenseState } from "@/lib/modules/access";
import {
  createProductAccountLink,
  getActiveLink,
  getProductLoginRedirect,
} from "@/lib/product-links/service";

export type ThyronixGatewayStep =
  | "pricing"
  | "pending"
  | "setup"
  | "disabled"
  | "ready"
  | "dealer_required";

export interface ThyronixGatewayState {
  step: ThyronixGatewayStep;
  reason?: string;
  code?: string;
  redirectTo?: string;
  linkId?: string;
  externalEmail?: string;
}

type EnaUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  dealerId?: string | null;
};

export async function resolveThyronixGatewayState(enaUser: EnaUser): Promise<ThyronixGatewayState> {
  if (!isAdminRole(enaUser.role)) {
    if (!enaUser.dealerId) {
      return { step: "dealer_required", reason: "THYRONIX için bayi hesabı gerekli", code: "DEALER_REQUIRED" };
    }

    const licenseState = await getModuleLicenseState(enaUser.dealerId, "THYRONIX");
    if (licenseState === "none") {
      return { step: "pricing", reason: "THYRONIX lisansı bulunamadı", code: "LISANS_YOK" };
    }
    if (licenseState === "pending") {
      return { step: "pending", reason: "THYRONIX lisansınız onay veya ödeme bekliyor", code: "LISANS_BEKLIYOR" };
    }
  }

  const link = await getActiveLink(enaUser.id, "THYRONIX");
  if (!link) {
    return { step: "setup" };
  }

  if (link.status === "DISABLED") {
    return { step: "disabled", linkId: link.id, externalEmail: link.externalEmail };
  }

  return {
    step: "ready",
    linkId: link.id,
    externalEmail: link.externalEmail,
    redirectTo: getProductLoginRedirect("THYRONIX", link.externalEmail),
  };
}

export async function provisionThyronixAccount(enaUser: EnaUser) {
  const gateway = await resolveThyronixGatewayState(enaUser);
  if (gateway.step === "pricing" || gateway.step === "pending" || gateway.step === "dealer_required") {
    throw new Error(gateway.reason || "THYRONIX erişimi yok");
  }

  const result = await createProductAccountLink(enaUser, "THYRONIX", { createdFrom: "gateway" });

  await recordThyronixSession({
    dealerId: enaUser.dealerId || "",
    enaUserId: enaUser.id,
    thyronixUserId: result.link.externalUserId,
  });

  return {
    ...result,
    redirectTo: getProductLoginRedirect("THYRONIX", result.link.externalEmail),
  };
}

export async function recordThyronixSession(data: {
  dealerId: string;
  enaUserId: string;
  thyronixUserId: string;
}) {
  const existing = await prisma.thyronixSessionBridge.findFirst({
    where: { enaUserId: data.enaUserId, thyronixUserId: data.thyronixUserId },
    orderBy: { lastLoginAt: "desc" },
  });

  if (existing) {
    return prisma.thyronixSessionBridge.update({
      where: { id: existing.id },
      data: { lastLoginAt: new Date(), dealerId: data.dealerId || existing.dealerId },
    });
  }

  return prisma.thyronixSessionBridge.create({ data });
}

export async function getThyronixIntegrationStats() {
  const [linkedCount, licensedCount, sessionCount, recentSessions, links] = await Promise.all([
    prisma.productAccountLink.count({ where: { productType: "THYRONIX", status: "LINKED" } }),
    prisma.moduleLicense.count({ where: { moduleKey: "THYRONIX", status: { in: ["ACTIVE", "TRIAL"] } } }),
    prisma.thyronixSessionBridge.count(),
    prisma.thyronixSessionBridge.findMany({
      orderBy: { lastLoginAt: "desc" },
      take: 20,
    }),
    prisma.productAccountLink.findMany({
      where: { productType: "THYRONIX", status: { not: "DELETED" } },
      include: {
        enaUser: { select: { id: true, email: true, name: true, dealerId: true } },
        externalUser: { select: { id: true, email: true, username: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const enaUserIds = [...new Set(recentSessions.map((s) => s.enaUserId))];
  const thyronixUserIds = [...new Set(recentSessions.map((s) => s.thyronixUserId))];

  const [enaUsers, thyronixUsers] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: enaUserIds } },
      select: { id: true, email: true, name: true },
    }),
    prisma.productExternalUser.findMany({
      where: { id: { in: thyronixUserIds } },
      select: { id: true, email: true, username: true },
    }),
  ]);

  const enaMap = Object.fromEntries(enaUsers.map((u) => [u.id, u]));
  const thyronixMap = Object.fromEntries(thyronixUsers.map((u) => [u.id, u]));

  const lastLogins = recentSessions.map((s) => ({
    id: s.id,
    dealerId: s.dealerId,
    lastLoginAt: s.lastLoginAt,
    enaUser: enaMap[s.enaUserId] || null,
    thyronixUser: thyronixMap[s.thyronixUserId] || null,
  }));

  const pendingLicenses = await prisma.moduleLicense.count({
    where: { moduleKey: "THYRONIX", status: { in: ["PENDING_PAYMENT", "PENDING_APPROVAL"] } },
  });

  return {
    connectionStatus: linkedCount > 0 ? "connected" : "awaiting_links",
    linkedUserCount: linkedCount,
    licensedDealerCount: licensedCount,
    pendingLicenseCount: pendingLicenses,
    totalSessionRecords: sessionCount,
    lastLogins,
    links,
  };
}
