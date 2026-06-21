import { prisma } from "@/lib/db";
import { isAdminRole, isSuperAdmin } from "@/lib/auth/admin-access";
import { getModuleLicenseState } from "@/lib/modules/access";
import {
  createProductAccountLink,
  getActiveLink,
  getProductLoginRedirect,
} from "@/lib/product-links/service";

import { isHiveEnabled, isHiveSalesActive } from "./config";

export type HiveGatewayStep =
  | "pricing"
  | "pending"
  | "setup"
  | "disabled"
  | "ready"
  | "dealer_required";

export interface HiveGatewayState {
  step: HiveGatewayStep;
  reason?: string;
  code?: string;
  redirectTo?: string;
  linkId?: string;
  externalEmail?: string;
  workspaceId?: string;
}

type EnaUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  dealerId?: string | null;
};

export const DEFAULT_HIVE_SETTINGS = {
  locale: "tr",
  timezone: "Europe/Istanbul",
  seoEnabled: true,
  geoEnabled: false,
  contentLimitMonthly: 10,
  sitesLimit: 1,
  onboardingCompleted: false,
  createdFrom: "ena-gateway",
};

export function getHiveWorkspaceDealerKey(enaUser: EnaUser): string {
  return enaUser.dealerId || `ena-user-${enaUser.id}`;
}

export async function ensureHiveWorkspace(
  enaUser: EnaUser,
  ownerUserId: string,
  workspaceName?: string
) {
  const dealerKey = getHiveWorkspaceDealerKey(enaUser);
  const existing = await prisma.hiveWorkspace.findUnique({ where: { dealerId: dealerKey } });

  if (existing) {
    if (!existing.ownerUserId && ownerUserId) {
      return prisma.hiveWorkspace.update({
        where: { id: existing.id },
        data: { ownerUserId, enaUserId: existing.enaUserId || enaUser.id },
      });
    }
    return existing;
  }

  const name =
    workspaceName ||
    (enaUser.dealerId
      ? `${enaUser.name || enaUser.email.split("@")[0]} Workspace`
      : `HIVE — ${enaUser.name || enaUser.email.split("@")[0]}`);

  return prisma.hiveWorkspace.create({
    data: {
      dealerId: dealerKey,
      enaUserId: enaUser.id,
      ownerUserId,
      name,
      status: "ACTIVE",
      settingsJson: JSON.stringify(DEFAULT_HIVE_SETTINGS),
    },
  });
}

export async function getHiveWorkspaceForUser(enaUser: EnaUser) {
  const dealerKey = getHiveWorkspaceDealerKey(enaUser);
  return prisma.hiveWorkspace.findUnique({ where: { dealerId: dealerKey } });
}

export async function resolveHiveGatewayState(enaUser: EnaUser): Promise<HiveGatewayState> {
  if (!isHiveEnabled()) {
    return { step: "disabled", reason: "HIVE modülü yakında kullanıma açılacak", code: "HIVE_DISABLED" };
  }

  if (isSuperAdmin(enaUser.role)) {
    await ensureHiveWorkspace(enaUser, enaUser.id);
    return { step: "ready", redirectTo: "/hive" };
  }

  if (!isAdminRole(enaUser.role)) {
    if (!enaUser.dealerId) {
      return { step: "dealer_required", reason: "HIVE için bayi hesabı gerekli", code: "DEALER_REQUIRED" };
    }

    const licenseState = await getModuleLicenseState(enaUser.dealerId, "HIVE");
    if (licenseState === "none") {
      return { step: "pricing", reason: "HIVE lisansı bulunamadı", code: "LISANS_YOK" };
    }
    if (licenseState === "pending") {
      return { step: "pending", reason: "HIVE lisansınız onay veya ödeme bekliyor", code: "LISANS_BEKLIYOR" };
    }
  }

  const link = await getActiveLink(enaUser.id, "HIVE");
  if (!link) {
    return { step: "setup" };
  }

  if (link.status === "DISABLED") {
    return { step: "disabled", linkId: link.id, externalEmail: link.externalEmail };
  }

  const workspace = await getHiveWorkspaceForUser(enaUser);

  return {
    step: "ready",
    linkId: link.id,
    externalEmail: link.externalEmail,
    workspaceId: workspace?.id,
    redirectTo: getProductLoginRedirect("HIVE", link.externalEmail),
  };
}

export async function provisionHiveAccount(enaUser: EnaUser) {
  const gateway = await resolveHiveGatewayState(enaUser);
  if (gateway.step === "pricing" || gateway.step === "pending" || gateway.step === "dealer_required") {
    throw new Error(gateway.reason || "HIVE erişimi yok");
  }

  const result = await createProductAccountLink(enaUser, "HIVE", { createdFrom: "gateway" });
  const workspace = await ensureHiveWorkspace(enaUser, result.link.externalUserId);

  await recordHiveSession({
    dealerId: enaUser.dealerId || "",
    enaUserId: enaUser.id,
    hiveUserId: result.link.externalUserId,
    workspaceId: workspace.id,
  });

  return {
    ...result,
    workspace,
    redirectTo: getProductLoginRedirect("HIVE", result.link.externalEmail),
  };
}

export async function recordHiveSession(data: {
  dealerId: string;
  enaUserId: string;
  hiveUserId: string;
  workspaceId?: string;
}) {
  const existing = await prisma.hiveSessionBridge.findFirst({
    where: { enaUserId: data.enaUserId, hiveUserId: data.hiveUserId },
    orderBy: { lastLoginAt: "desc" },
  });

  if (existing) {
    return prisma.hiveSessionBridge.update({
      where: { id: existing.id },
      data: {
        lastLoginAt: new Date(),
        dealerId: data.dealerId || existing.dealerId,
        workspaceId: data.workspaceId || existing.workspaceId,
      },
    });
  }

  return prisma.hiveSessionBridge.create({
    data: {
      dealerId: data.dealerId,
      enaUserId: data.enaUserId,
      hiveUserId: data.hiveUserId,
      workspaceId: data.workspaceId || "",
    },
  });
}

export async function getHiveIntegrationStats() {
  const [workspaceCount, linkedCount, licensedCount, sessionCount, recentSessions, links, workspaces] =
    await Promise.all([
      prisma.hiveWorkspace.count(),
      prisma.productAccountLink.count({ where: { productType: "HIVE", status: "LINKED" } }),
      prisma.moduleLicense.count({ where: { moduleKey: "HIVE", status: { in: ["ACTIVE", "TRIAL"] } } }),
      prisma.hiveSessionBridge.count(),
      prisma.hiveSessionBridge.findMany({ orderBy: { lastLoginAt: "desc" }, take: 20 }),
      prisma.productAccountLink.findMany({
        where: { productType: "HIVE", status: { not: "DELETED" } },
        include: {
          enaUser: { select: { id: true, email: true, name: true, dealerId: true } },
          externalUser: { select: { id: true, email: true, username: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.hiveWorkspace.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, name: true, dealerId: true, ownerUserId: true, status: true, createdAt: true },
      }),
    ]);

  const enaUserIds = [...new Set(recentSessions.map((s) => s.enaUserId))];
  const hiveUserIds = [...new Set(recentSessions.map((s) => s.hiveUserId))];
  const workspaceIds = [...new Set(recentSessions.map((s) => s.workspaceId).filter(Boolean))];

  const [enaUsers, hiveUsers, sessionWorkspaces] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: enaUserIds } },
      select: { id: true, email: true, name: true },
    }),
    prisma.productExternalUser.findMany({
      where: { id: { in: hiveUserIds } },
      select: { id: true, email: true, username: true },
    }),
    prisma.hiveWorkspace.findMany({
      where: { id: { in: workspaceIds } },
      select: { id: true, name: true },
    }),
  ]);

  const enaMap = Object.fromEntries(enaUsers.map((u) => [u.id, u]));
  const hiveMap = Object.fromEntries(hiveUsers.map((u) => [u.id, u]));
  const workspaceMap = Object.fromEntries(sessionWorkspaces.map((w) => [w.id, w]));

  const lastLogins = recentSessions.map((s) => ({
    id: s.id,
    dealerId: s.dealerId,
    workspaceId: s.workspaceId,
    lastLoginAt: s.lastLoginAt,
    enaUser: enaMap[s.enaUserId] || null,
    hiveUser: hiveMap[s.hiveUserId] || null,
    workspace: s.workspaceId ? workspaceMap[s.workspaceId] || null : null,
  }));

  const pendingLicenses = await prisma.moduleLicense.count({
    where: { moduleKey: "HIVE", status: { in: ["PENDING_PAYMENT", "PENDING_APPROVAL"] } },
  });

  return {
    connectionStatus: linkedCount > 0 ? "connected" : "awaiting_links",
    workspaceCount,
    linkedUserCount: linkedCount,
    licensedDealerCount: licensedCount,
    pendingLicenseCount: pendingLicenses,
    totalSessionRecords: sessionCount,
    lastLogins,
    links,
    workspaces,
  };
}
