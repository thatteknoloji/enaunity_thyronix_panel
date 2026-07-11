import { prisma } from "@/lib/db";
import { getProductLibraryOverview } from "@/lib/product-library/package-access-service";
import { isAdminRole, isSuperAdmin } from "@/lib/auth/admin-access";
import { getDealerApprovalStatus, getDealerModuleLicense, getModuleLabel, getModuleLicenseState } from "@/lib/modules/access";
import {
  CUSTOMER_PRODUCT_KEYS,
  PRODUCT_META,
  type CustomerProductCard,
  type CustomerProductKey,
  type CustomerProductsOverview,
  type UnifiedStatus,
} from "./types";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  dealerId?: string | null;
};

export function normalizeProductStatus(
  moduleKey: CustomerProductKey,
  rawStatus: string | null,
  approvalStatus?: string | null
): UnifiedStatus {
  if (moduleKey === "ENA_COMMERCE") {
    if (approvalStatus === "ACTIVE") return "ACTIVE";
    if (approvalStatus === "REJECTED" || approvalStatus === "SUSPENDED") return "INACTIVE";
    if (approvalStatus) return "PENDING";
    return "INACTIVE";
  }

  switch (rawStatus) {
    case "ACTIVE":
      return "ACTIVE";
    case "TRIAL":
      return "TRIAL";
    case "PENDING_PAYMENT":
    case "PENDING_APPROVAL":
      return "PENDING";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "INACTIVE";
  }
}

function resolveDealerId(user: SessionUser, requestedDealerId?: string | null): string | null {
  if (isAdminRole(user.role) && requestedDealerId) return requestedDealerId;
  return user.dealerId || null;
}

async function getPlanName(moduleKey: string, planKey: string | null) {
  if (!planKey) return null;
  const plan = await prisma.modulePlan.findFirst({
    where: { moduleKey, planKey, isActive: true },
    select: { name: true },
  });
  return plan?.name || planKey;
}

async function getLastPayment(dealerId: string, moduleKey: string) {
  return prisma.modulePayment.findFirst({
    where: { dealerId, moduleKey },
    orderBy: { createdAt: "desc" },
  });
}

async function getLastLogin(enaUserId: string, moduleKey: CustomerProductKey) {
  if (moduleKey === "LINKSLASH") return null;

  if (moduleKey === "ENA_COMMERCE") {
    const lastOrder = await prisma.order.findFirst({
      where: { userId: enaUserId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return lastOrder?.createdAt || null;
  }

  const productType = moduleKey as "THYRONIX" | "HIVE";
  const link = await prisma.productAccountLink.findFirst({
    where: { enaUserId, productType, status: "LINKED" },
    select: { lastLoginAt: true },
  });

  const sessionBridge =
    moduleKey === "THYRONIX"
      ? await prisma.thyronixSessionBridge.findFirst({
          where: { enaUserId },
          orderBy: { lastLoginAt: "desc" },
          select: { lastLoginAt: true },
        })
      : await prisma.hiveSessionBridge.findFirst({
          where: { enaUserId },
          orderBy: { lastLoginAt: "desc" },
          select: { lastLoginAt: true },
        });

  const dates = [link?.lastLoginAt, sessionBridge?.lastLoginAt].filter(Boolean) as Date[];
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (a > b ? a : b));
}

async function buildProductCard(
  dealerId: string | null,
  enaUserId: string,
  moduleKey: CustomerProductKey,
  approvalStatus?: string | null,
  userRole?: string
): Promise<CustomerProductCard> {
  const meta = PRODUCT_META[moduleKey];

  if (isSuperAdmin(userRole)) {
    return {
      moduleKey,
      label: meta.label,
      description: meta.description,
      status: "ACTIVE",
      rawStatus: "ACTIVE",
      planKey: "super-admin",
      planName: "Süper Admin",
      lastPaymentAt: null,
      lastPaymentAmount: null,
      lastPaymentStatus: null,
      lastLoginAt: null,
      linkStatus: null,
      licenseId: null,
      entitled: true,
    };
  }

  let license = null;
  let rawStatus: string | null = null;
  let planKey: string | null = null;
  let licenseId: string | null = null;
  let linkStatus: string | null = null;

  if (moduleKey === "ENA_COMMERCE") {
    rawStatus = approvalStatus || null;
  } else if (moduleKey === "PRODUCT_LIBRARY" && dealerId) {
    const overview = await getProductLibraryOverview(dealerId);
    license = await prisma.moduleLicense.findFirst({
      where: { dealerId, moduleKey: "PRODUCT_LIBRARY" },
      orderBy: { createdAt: "desc" },
    });
    rawStatus = license?.status || (overview.activePackageCount > 0 ? "ACTIVE" : "INACTIVE");
    planKey = license?.planKey || null;
    licenseId = license?.id || null;

    const lastPayment = await getLastPayment(dealerId, "PRODUCT_LIBRARY");
    const planName = planKey;
    const lastLoginAt = overview.lastDownloadAt;

    return {
      moduleKey,
      label: meta.label,
      description: meta.description,
      status: normalizeProductStatus(moduleKey, rawStatus, approvalStatus),
      rawStatus: rawStatus || "NONE",
      planKey,
      planName,
      lastPaymentAt: lastPayment?.paidAt?.toISOString() || lastPayment?.createdAt?.toISOString() || null,
      lastPaymentAmount: lastPayment?.amount ?? null,
      lastPaymentStatus: lastPayment?.status ?? null,
      lastLoginAt: lastLoginAt?.toISOString() || null,
      linkStatus: null,
      licenseId,
      libraryStats: {
        packageCount: overview.packageCount,
        activePackageCount: overview.activePackageCount,
        pendingPayments: overview.pendingPayments,
        lastDownloadAt: overview.lastDownloadAt?.toISOString() || null,
        lastDownloadPackage: overview.lastDownloadPackage,
      },
    };
  } else if (dealerId) {
    license = await getDealerModuleLicense(dealerId, moduleKey);
    rawStatus = license?.status || null;
    planKey = license?.planKey || null;
    licenseId = license?.id || null;

    const licenseState = await getModuleLicenseState(dealerId, moduleKey);
    if (licenseState === "active") {
      rawStatus = "ACTIVE";
    } else if (licenseState === "pending") {
      rawStatus = license?.status === "TRIAL" ? "TRIAL" : "PENDING_APPROVAL";
    } else if (license) {
      rawStatus = license.status === "EXPIRED" ? "EXPIRED" : "INACTIVE";
    } else {
      rawStatus = "INACTIVE";
    }
  }

  const link =
    moduleKey === "THYRONIX" || moduleKey === "HIVE"
      ? await prisma.productAccountLink.findFirst({
          where: { enaUserId, productType: moduleKey, status: { not: "DELETED" } },
          select: { status: true },
        })
      : null;
  linkStatus = link?.status || null;

  const lastPayment = dealerId ? await getLastPayment(dealerId, moduleKey) : null;
  const planName = await getPlanName(moduleKey, planKey);
  const lastLoginAt = await getLastLogin(enaUserId, moduleKey);
  const entitled = dealerId ? (await getModuleLicenseState(dealerId, moduleKey)) === "active" : false;

  return {
    moduleKey,
    label: meta.label,
    description: meta.description,
    status: normalizeProductStatus(moduleKey, rawStatus, approvalStatus),
    rawStatus: rawStatus || "NONE",
    planKey,
    planName,
    lastPaymentAt: lastPayment?.paidAt?.toISOString() || lastPayment?.createdAt?.toISOString() || null,
    lastPaymentAmount: lastPayment?.amount ?? null,
    lastPaymentStatus: lastPayment?.status ?? null,
    lastLoginAt: lastLoginAt?.toISOString() || null,
    linkStatus,
    licenseId,
    entitled,
  };
}

export async function getCustomerProductsOverview(
  user: SessionUser,
  options?: { dealerId?: string }
): Promise<CustomerProductsOverview> {
  const dealerId = resolveDealerId(user, options?.dealerId);
  const approval = dealerId ? await getDealerApprovalStatus(dealerId) : null;

  let dealerName: string | null = null;
  if (dealerId) {
    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId }, select: { name: true, company: true } });
    dealerName = dealer?.company || dealer?.name || null;
  }

  const products = await Promise.all(
    CUSTOMER_PRODUCT_KEYS.map((key) =>
      buildProductCard(dealerId, user.id, key, approval?.status, user.role)
    )
  );

  return { dealerId, dealerName, products };
}

export async function getCustomerLicenses(user: SessionUser, dealerIdOverride?: string) {
  const dealerId = resolveDealerId(user, dealerIdOverride);
  if (!dealerId && !isAdminRole(user.role)) {
    throw new Error("Bayi hesabı gerekli");
  }

  const approval = dealerId ? await getDealerApprovalStatus(dealerId) : null;
  const licenses = dealerId
    ? await prisma.moduleLicense.findMany({
        where: { dealerId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const cards = await Promise.all(
    CUSTOMER_PRODUCT_KEYS.map((key) =>
      buildProductCard(dealerId, user.id, key, approval?.status, user.role)
    )
  );

  return {
    dealerId,
    approval: approval
      ? {
          status: approval.status,
          documentStatus: approval.documentStatus,
          paymentStatus: approval.paymentStatus,
          companyName: approval.companyName,
        }
      : null,
    licenses: licenses.map((l) => ({
      ...l,
      moduleLabel: getModuleLabel(l.moduleKey),
      unifiedStatus: normalizeProductStatus(l.moduleKey as CustomerProductKey, l.status),
    })),
    products: cards,
  };
}

export async function getCustomerPayments(user: SessionUser, dealerIdOverride?: string) {
  const dealerId = resolveDealerId(user, dealerIdOverride);
  if (!dealerId) throw new Error("Bayi hesabı gerekli");

  const payments = await prisma.modulePayment.findMany({
    where: { dealerId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return {
    dealerId,
    payments: payments.map((p) => ({
      ...p,
      moduleLabel: getModuleLabel(p.moduleKey),
    })),
  };
}

export async function getCustomerInvoices(user: SessionUser, dealerIdOverride?: string) {
  const dealerId = resolveDealerId(user, dealerIdOverride);
  if (!dealerId) throw new Error("Bayi hesabı gerekli");

  const payments = await prisma.modulePayment.findMany({
    where: {
      dealerId,
      OR: [{ status: "PAID" }, { invoiceUrl: { not: "" } }],
    },
    orderBy: { paidAt: "desc" },
    take: 100,
  });

  return {
    dealerId,
    invoices: payments.map((p) => ({
      id: p.id,
      moduleKey: p.moduleKey,
      moduleLabel: getModuleLabel(p.moduleKey),
      planKey: p.planKey,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      invoiceUrl: p.invoiceUrl,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
  };
}

export async function getAdminCustomerProducts() {
  const dealers = await prisma.dealer.findMany({
    select: { id: true, name: true, company: true, email: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  const dealerIds = dealers.map((d) => d.id);

  const [licenses, payments, approvals, links] = await Promise.all([
    prisma.moduleLicense.findMany({ where: { dealerId: { in: dealerIds } } }),
    prisma.modulePayment.findMany({
      where: { dealerId: { in: dealerIds } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dealerApproval.findMany({ where: { dealerId: { in: dealerIds } } }),
    prisma.productAccountLink.findMany({
      where: { status: "LINKED", externalUser: { productType: { in: ["THYRONIX", "HIVE"] } } },
      include: { enaUser: { select: { dealerId: true } } },
    }),
  ]);

  const approvalMap = Object.fromEntries(approvals.map((a) => [a.dealerId, a]));
  const licensesByDealer = licenses.reduce<Record<string, typeof licenses>>((acc, l) => {
    (acc[l.dealerId] ||= []).push(l);
    return acc;
  }, {});
  const paymentsByDealer = payments.reduce<Record<string, typeof payments>>((acc, p) => {
    if (!acc[p.dealerId]?.length) acc[p.dealerId] = [];
    if (acc[p.dealerId].length < 5) acc[p.dealerId].push(p);
    return acc;
  }, {});
  const linksByDealer = links.reduce<Record<string, string[]>>((acc, l) => {
    const dId = l.enaUser?.dealerId;
    if (!dId) return acc;
    (acc[dId] ||= []).push(l.productType);
    return acc;
  }, {});

  return dealers.map((dealer) => {
    const approval = approvalMap[dealer.id];
    const dealerLicenses = licensesByDealer[dealer.id] || [];
    const lastPayment = paymentsByDealer[dealer.id]?.[0] || null;
    const ownedProducts: string[] = [];

    if (approval?.status === "ACTIVE") ownedProducts.push("ENA Ticaret");
    for (const lic of dealerLicenses) {
      if (["ACTIVE", "TRIAL"].includes(lic.status)) {
        ownedProducts.push(getModuleLabel(lic.moduleKey));
      }
    }
    for (const pt of linksByDealer[dealer.id] || []) {
      if (!ownedProducts.includes(pt)) ownedProducts.push(pt);
    }

    return {
      dealer,
      approvalStatus: approval?.status || "NONE",
      ownedProducts: [...new Set(ownedProducts)],
      licenses: dealerLicenses.map((l) => ({
        id: l.id,
        moduleKey: l.moduleKey,
        planKey: l.planKey,
        status: l.status,
        unifiedStatus: normalizeProductStatus(l.moduleKey as CustomerProductKey, l.status),
      })),
      lastPayment: lastPayment
        ? {
            id: lastPayment.id,
            moduleKey: lastPayment.moduleKey,
            amount: lastPayment.amount,
            status: lastPayment.status,
            paidAt: lastPayment.paidAt,
            createdAt: lastPayment.createdAt,
          }
        : null,
    };
  });
}

export function assertCustomerProductsAccess(user: SessionUser, dealerId?: string | null) {
  if (isAdminRole(user.role)) return;
  if (!user.dealerId) throw new Error("Bu sayfa için bayi hesabı gerekli");
  if (dealerId && dealerId !== user.dealerId) throw new Error("Bu bayinin ürünlerine erişim yok");
}
