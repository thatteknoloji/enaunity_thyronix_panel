import { prisma } from "@/lib/db";

export async function getHiveAdminOverview() {
  const [
    totalLicenses,
    activeLicenses,
    trialLicenses,
    pendingLicenses,
    workspaceCount,
    recentSessions,
  ] = await Promise.all([
    prisma.moduleLicense.count({ where: { moduleKey: { in: ["HIVE", "HIVE_PRO"] } } }),
    prisma.moduleLicense.count({ where: { moduleKey: { in: ["HIVE", "HIVE_PRO"] }, status: "ACTIVE" } }),
    prisma.moduleLicense.count({ where: { moduleKey: { in: ["HIVE", "HIVE_PRO"] }, status: "TRIAL" } }),
    prisma.moduleLicense.count({
      where: { moduleKey: { in: ["HIVE", "HIVE_PRO"] }, status: { in: ["PENDING_PAYMENT", "PENDING_APPROVAL"] } },
    }),
    prisma.hiveWorkspace.count(),
    prisma.hiveSessionBridge.findMany({ orderBy: { lastLoginAt: "desc" }, take: 10 }),
  ]);

  const health = await checkHiveHealth();

  return {
    totalLicenses,
    activeLicenses,
    trialLicenses,
    pendingLicenses,
    workspaceCount,
    recentSessions,
    healthStatus: health.status,
    health,
  };
}

export async function getHiveWorkspaces() {
  const workspaces = await prisma.hiveWorkspace.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const dealerIds = [...new Set(workspaces.map((w) => w.dealerId).filter(Boolean))];
  const dealers = await prisma.dealer.findMany({
    where: { id: { in: dealerIds } },
    select: { id: true, company: true, name: true },
  });
  const dealerMap = Object.fromEntries(dealers.map((d) => [d.id, d]));

  return workspaces.map((w) => ({
    ...w,
    dealerName: dealerMap[w.dealerId]?.company || dealerMap[w.dealerId]?.name || w.dealerId,
  }));
}

export async function getHiveLicenses() {
  const licenses = await prisma.moduleLicense.findMany({
    where: { moduleKey: { in: ["HIVE", "HIVE_PRO"] } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const dealerIds = [...new Set(licenses.map((l) => l.dealerId))];
  const dealers = await prisma.dealer.findMany({
    where: { id: { in: dealerIds } },
    select: { id: true, company: true, name: true },
  });
  const dealerMap = Object.fromEntries(dealers.map((d) => [d.id, d]));

  return licenses.map((l) => ({
    ...l,
    dealerName: dealerMap[l.dealerId]?.company || dealerMap[l.dealerId]?.name || l.dealerId,
  }));
}

export async function getHiveGatewayLinks() {
  return prisma.productAccountLink.findMany({
    where: { productType: "HIVE", status: { not: "DELETED" } },
    include: {
      enaUser: { select: { id: true, email: true, name: true, dealerId: true } },
      externalUser: { select: { id: true, email: true, username: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function getHiveSessionLogs() {
  const sessions = await prisma.hiveSessionBridge.findMany({
    orderBy: { lastLoginAt: "desc" },
    take: 50,
  });

  const enaUserIds = [...new Set(sessions.map((s) => s.enaUserId))];
  const enaUsers = await prisma.user.findMany({
    where: { id: { in: enaUserIds } },
    select: { id: true, email: true, name: true },
  });
  const userMap = Object.fromEntries(enaUsers.map((u) => [u.id, u]));

  return sessions.map((s) => ({
    ...s,
    enaUser: userMap[s.enaUserId] || null,
  }));
}

export async function checkHiveHealth() {
  const baseUrl = process.env.HIVE_BASE_URL || "https://hive.thiqos.com";
  const proxyMode = process.env.HIVE_PROXY_MODE || "internal";
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${baseUrl}/health`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    const latency = Date.now() - start;
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return {
      reachable: res.ok,
      status: res.ok ? "healthy" : "degraded",
      latency,
      baseUrl,
      proxyMode,
      httpStatus: res.status,
      body,
    };
  } catch (e) {
    return {
      reachable: false,
      status: "unreachable",
      latency: Date.now() - start,
      baseUrl,
      proxyMode,
      error: e instanceof Error ? e.message : "Connection failed",
    };
  }
}
