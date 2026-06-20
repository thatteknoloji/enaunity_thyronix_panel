import { prisma } from "@/lib/db";
import { getAvailablePlans } from "@/lib/modules/access";
import { createProductAccountLink } from "@/lib/product-links/service";
import { ensureHiveWorkspace, recordHiveSession } from "@/lib/hive/integration";
import { recordThyronixSession } from "@/lib/thyronix/integration";
import type { ProductType } from "@/lib/product-links/types";

export type AdminModuleKey = "THYRONIX" | "HIVE";

const LICENSE_STATUSES = [
  "ACTIVE",
  "TRIAL",
  "PENDING_APPROVAL",
  "PENDING_PAYMENT",
  "SUSPENDED",
  "INACTIVE",
  "CANCELLED",
  "EXPIRED",
] as const;

export type AdminLicenseStatus = (typeof LICENSE_STATUSES)[number];

export function isAdminModuleKey(v: string): v is AdminModuleKey {
  return v === "THYRONIX" || v === "HIVE";
}

function computeEndsAt(status: string, months?: number, trialDays?: number): Date | null {
  if (status === "TRIAL" && trialDays) {
    const d = new Date();
    d.setDate(d.getDate() + trialDays);
    return d;
  }
  if (status === "ACTIVE" && months && months > 0) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d;
  }
  return null;
}

export async function getModuleAccessOverview(moduleKey: AdminModuleKey) {
  const [plans, licenses, dealers, links] = await Promise.all([
    getAvailablePlans(moduleKey),
    prisma.moduleLicense.findMany({
      where: { moduleKey },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.dealer.findMany({
      select: { id: true, name: true, company: true, email: true, status: true },
      orderBy: { company: "asc" },
    }),
    prisma.productAccountLink.findMany({
      where: { productType: moduleKey, status: { not: "DELETED" } },
      include: {
        externalUser: { select: { id: true, email: true, username: true } },
        enaUser: { select: { id: true, email: true, name: true, dealerId: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const dealerIds = [...new Set(licenses.map((l) => l.dealerId))];
  const users = dealerIds.length
    ? await prisma.user.findMany({
        where: { dealerId: { in: dealerIds } },
        select: { id: true, email: true, name: true, dealerId: true, role: true },
        orderBy: { name: "asc" },
      })
    : [];

  const dealerMap = Object.fromEntries(dealers.map((d) => [d.id, d]));
  const usersByDealer: Record<string, typeof users> = {};
  for (const u of users) {
    if (!u.dealerId) continue;
    if (!usersByDealer[u.dealerId]) usersByDealer[u.dealerId] = [];
    usersByDealer[u.dealerId].push(u);
  }

  const linksByDealer: Record<string, typeof links> = {};
  for (const link of links) {
    const did = link.enaUser?.dealerId;
    if (!did) continue;
    if (!linksByDealer[did]) linksByDealer[did] = [];
    linksByDealer[did].push(link);
  }

  const rows = licenses.map((license) => ({
    license,
    dealer: dealerMap[license.dealerId] || null,
    users: usersByDealer[license.dealerId] || [],
    links: linksByDealer[license.dealerId] || [],
  }));

  return {
    moduleKey,
    plans: plans.map((p) => ({
      id: p.id,
      planKey: p.planKey,
      name: p.name,
      description: p.description,
      monthlyPrice: p.monthlyPrice,
      yearlyPrice: p.yearlyPrice,
    })),
    dealers,
    rows,
    statuses: LICENSE_STATUSES,
  };
}

export async function getDealerUsers(dealerId: string) {
  return prisma.user.findMany({
    where: { dealerId },
    select: { id: true, email: true, name: true, role: true, dealerId: true },
    orderBy: { name: "asc" },
  });
}

export async function upsertModuleLicense(input: {
  dealerId: string;
  moduleKey: AdminModuleKey;
  planKey: string;
  status: string;
  trialDays?: number;
  months?: number;
}) {
  const endsAt = computeEndsAt(input.status, input.months, input.trialDays);
  const trialEndsAt = input.status === "TRIAL" ? endsAt : null;

  const existing = await prisma.moduleLicense.findFirst({
    where: { dealerId: input.dealerId, moduleKey: input.moduleKey },
    orderBy: { createdAt: "desc" },
  });

  const data = {
    planKey: input.planKey,
    status: input.status,
    startsAt: input.status === "ACTIVE" || input.status === "TRIAL" ? new Date() : existing?.startsAt,
    endsAt,
    trialEndsAt,
    billingPeriod: (input.months && input.months >= 12) ? "yearly" : "monthly",
    ...(input.status === "ACTIVE" || input.status === "TRIAL"
      ? {
          lifecycleStage: "active",
          lifecycleUpdatedAt: new Date(),
          reminder30Sent: false,
          reminder15Sent: false,
          reminderLastDaySent: false,
        }
      : {}),
  };

  if (existing) {
    return prisma.moduleLicense.update({ where: { id: existing.id }, data });
  }

  return prisma.moduleLicense.create({
    data: {
      dealerId: input.dealerId,
      moduleKey: input.moduleKey,
      ...data,
    },
  });
}

export async function provisionModuleAccess(input: {
  dealerId: string;
  moduleKey: AdminModuleKey;
  planKey: string;
  status: string;
  userId?: string;
  createProductUser?: boolean;
  trialDays?: number;
  months?: number;
}) {
  const license = await upsertModuleLicense(input);

  // Manuel admin atamasında bayi onayını aktifleştir (modül erişimi için gerekli)
  if (input.status === "ACTIVE" || input.status === "TRIAL") {
    await prisma.dealerApproval.upsert({
      where: { dealerId: input.dealerId },
      create: { dealerId: input.dealerId, status: "ACTIVE", approvedAt: new Date() },
      update: { status: "ACTIVE", approvedAt: new Date() },
    });
  }

  let linkResult: Awaited<ReturnType<typeof createProductAccountLink>> | null = null;
  let workspace: { id: string; name: string } | null = null;

  if (input.createProductUser) {
    let user = input.userId
      ? await prisma.user.findUnique({ where: { id: input.userId } })
      : await prisma.user.findFirst({ where: { dealerId: input.dealerId }, orderBy: { createdAt: "asc" } });

    if (!user) {
      throw new Error("Bu bayiye bağlı ENA kullanıcısı bulunamadı — önce bayi kullanıcısı oluşturun");
    }
    if (user.dealerId !== input.dealerId) {
      throw new Error("Seçilen kullanıcı bu bayiye ait değil");
    }

    linkResult = await createProductAccountLink(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        dealerId: user.dealerId,
      },
      input.moduleKey as ProductType,
      { createdFrom: "admin" },
    );

    if (input.moduleKey === "HIVE") {
      const ws = await ensureHiveWorkspace(
        { id: user.id, email: user.email, name: user.name, role: user.role, dealerId: user.dealerId },
        linkResult.link.externalUserId,
      );
      workspace = { id: ws.id, name: ws.name };
      await recordHiveSession({
        dealerId: user.dealerId || "",
        enaUserId: user.id,
        hiveUserId: linkResult.link.externalUserId,
        workspaceId: ws.id,
      });
    } else {
      await recordThyronixSession({
        dealerId: user.dealerId || "",
        enaUserId: user.id,
        thyronixUserId: linkResult.link.externalUserId,
      });
    }
  }

  return {
    license,
    link: linkResult?.link || null,
    tempPassword: linkResult?.tempPassword || null,
    workspace,
  };
}

export async function createProductUserForDealer(input: {
  dealerId: string;
  moduleKey: AdminModuleKey;
  userId: string;
}) {
  const license = await prisma.moduleLicense.findFirst({
    where: {
      dealerId: input.dealerId,
      moduleKey: input.moduleKey,
      status: { in: ["ACTIVE", "TRIAL"] },
    },
  });
  if (!license) {
    throw new Error("Önce aktif veya deneme lisansı tanımlayın");
  }

  return provisionModuleAccess({
    ...input,
    planKey: license.planKey,
    status: license.status,
    createProductUser: true,
  });
}
