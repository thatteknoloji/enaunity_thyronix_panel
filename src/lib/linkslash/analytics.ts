import { prisma } from "@/lib/db";

const PLATFORM_MAP: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  twitter: "X",
  x: "X",
  pinterest: "Pinterest",
  reddit: "Reddit",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  threads: "Threads",
};

export function detectImportPlatform(url: string, sourceType = "", sharedFrom = ""): string {
  const hay = `${url} ${sourceType} ${sharedFrom}`.toLowerCase();
  for (const [key, label] of Object.entries(PLATFORM_MAP)) {
    if (hay.includes(key)) return label;
  }
  if (/instagram\.com/i.test(url)) return "Instagram";
  if (/tiktok\.com/i.test(url)) return "TikTok";
  if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
  if (/facebook\.com|fb\.watch/i.test(url)) return "Facebook";
  if (/twitter\.com|x\.com/i.test(url)) return "X";
  if (/pinterest\./i.test(url)) return "Pinterest";
  return "Diğer";
}

export async function logLinkSlashImport(input: {
  userId: string;
  dealerId?: string | null;
  url: string;
  sourceType?: string;
  sharedFrom?: string;
  client?: string;
  status?: string;
}) {
  return prisma.linkSlashImportLog.create({
    data: {
      userId: input.userId,
      dealerId: input.dealerId || "",
      url: input.url.slice(0, 2000),
      sourcePlatform: detectImportPlatform(input.url, input.sourceType, input.sharedFrom),
      client: input.client || "mobile",
      status: input.status || "saved",
    },
  });
}

export async function getLinkSlashAnalytics() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [licensedUsers, activeDevices, cloudLinks, imports24h, importsToday, logins24h, recentImports] =
    await Promise.all([
      prisma.moduleLicense.count({ where: { moduleKey: "LINKSLASH", status: { in: ["ACTIVE", "TRIAL"] } } }),
      prisma.linkSlashDevice.count({ where: { status: "active" } }),
      prisma.linkSlashLink.count({ where: { deletedAt: null } }),
      prisma.linkSlashImportLog.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.linkSlashImportLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.linkSlashDevice.count({ where: { lastSeenAt: { gte: dayAgo }, status: "active" } }),
      prisma.linkSlashImportLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, userId: true, dealerId: true, url: true, sourcePlatform: true, status: true, createdAt: true },
      }),
    ]);

  const dailyRows = await prisma.linkSlashImportLog.findMany({
    where: { createdAt: { gte: weekAgo } },
    select: { createdAt: true },
  });
  const dailyMap = new Map<string, number>();
  dailyRows.forEach((r) => {
    const key = r.createdAt.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
  });
  const daily = [...dailyMap.entries()].map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day));

  const monthRows = await prisma.linkSlashImportLog.findMany({
    where: { createdAt: { gte: monthAgo } },
    select: { createdAt: true },
  });
  const weekMap = new Map<string, number>();
  monthRows.forEach((r) => {
    const d = r.createdAt;
    const week = `${d.getFullYear()}-W${Math.ceil((d.getDate() + 6) / 7)}`;
    weekMap.set(week, (weekMap.get(week) || 0) + 1);
  });
  const weekly = [...weekMap.entries()].map(([week, count]) => ({ week, count }));

  const allRows = await prisma.linkSlashImportLog.findMany({ select: { createdAt: true }, take: 5000, orderBy: { createdAt: "desc" } });
  const monthMap = new Map<string, number>();
  allRows.forEach((r) => {
    const key = r.createdAt.toISOString().slice(0, 7);
    monthMap.set(key, (monthMap.get(key) || 0) + 1);
  });
  const monthly = [...monthMap.entries()].map(([month, count]) => ({ month, count })).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);

  return {
    cards: {
      licensedUsers,
      logins24h,
      importsTotal: cloudLinks,
      importsToday,
      imports24h,
      activeDevices,
    },
    charts: { daily, weekly, monthly },
    recentImports,
  };
}
