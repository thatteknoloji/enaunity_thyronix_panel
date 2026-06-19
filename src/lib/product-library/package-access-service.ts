import { prisma } from "@/lib/db";
import { canAccessPackageLevel, getDealerLibraryTier } from "./license";
import type { LicenseLevel } from "./types";
import { createPaymentIntent } from "@/lib/payments/payment-service";
import { assertPaymentMethodAllowed, paymentDeadlineFromNow } from "@/lib/payments/payment-method-policy";
import { notifyBankTransferCreated } from "@/lib/payments/payment-deadline-worker";
import { resolveProviderKey } from "@/lib/payments/gateway-config";
import { calculatePaymentTotal, getPaymentSettings } from "@/lib/payments/payment-settings";

const MODULE_KEY = "PRODUCT_LIBRARY";

async function upsertDealerModuleLicense(
  dealerId: string,
  data: { planKey: string; status: string; startsAt?: Date }
) {
  const existing = await prisma.moduleLicense.findFirst({
    where: { dealerId, moduleKey: MODULE_KEY },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return prisma.moduleLicense.update({
      where: { id: existing.id },
      data: { planKey: data.planKey, status: data.status, startsAt: data.startsAt },
    });
  }
  return prisma.moduleLicense.create({
    data: {
      dealerId,
      moduleKey: MODULE_KEY,
      planKey: data.planKey,
      status: data.status,
      startsAt: data.startsAt,
    },
  });
}

export type PackageDealerState =
  | "ACCESSIBLE"
  | "PURCHASE"
  | "PENDING"
  | "INACTIVE";

export function resolvePackagePrice(pkg: {
  isFree: boolean;
  billingType: string | null;
  oneTimePrice: number | null;
  monthlyPrice: number;
  yearlyPrice: number;
}) {
  if (pkg.isFree || pkg.billingType === "FREE") return 0;
  if (pkg.billingType === "ONE_TIME") return pkg.oneTimePrice ?? 0;
  if (pkg.billingType === "MONTHLY") return pkg.monthlyPrice;
  if (pkg.billingType === "YEARLY") return pkg.yearlyPrice;
  return pkg.monthlyPrice || pkg.oneTimePrice || 0;
}

export async function getDealerPackageAccess(dealerId: string, packageId: string) {
  return prisma.productPackageAccess.findUnique({
    where: { packageId_dealerId: { packageId, dealerId } },
  });
}

export async function hasActivePackageAccess(dealerId: string, packageId: string) {
  const access = await getDealerPackageAccess(dealerId, packageId);
  return access?.status === "ACTIVE";
}

export async function dealerCanDownloadPackage(dealerId: string, packageId: string) {
  const pkg = await prisma.productPackage.findUnique({ where: { id: packageId } });
  if (!pkg || pkg.status !== "ACTIVE") {
    return { ok: false as const, reason: "INACTIVE" as const };
  }

  const access = await getDealerPackageAccess(dealerId, packageId);
  if (access?.status === "ACTIVE") {
    return { ok: true as const, pkg, tier: await getDealerLibraryTier(dealerId) };
  }

  if (pkg.isFree || pkg.billingType === "FREE") {
    const tier = await getDealerLibraryTier(dealerId);
    if (canAccessPackageLevel(tier, pkg.licenseLevel as LicenseLevel)) {
      return { ok: true as const, pkg, tier };
    }
  }

  return { ok: false as const, reason: "LICENSE_DENIED" as const, pkg };
}

export async function getDealerPackageStates(dealerId: string) {
  const [packages, tier, accessRows, pendingPayments] = await Promise.all([
    prisma.productPackage.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    }),
    getDealerLibraryTier(dealerId),
    prisma.productPackageAccess.findMany({ where: { dealerId } }),
    prisma.modulePayment.findMany({
      where: {
        dealerId,
        moduleKey: MODULE_KEY,
        status: { in: ["PENDING", "WAITING_PAYMENT", "MANUAL_REVIEW"] },
      },
    }),
  ]);

  const accessByPackage = new Map(accessRows.map((a) => [a.packageId, a]));

  return packages.map((pkg) => {
    const access = accessByPackage.get(pkg.id);
    const pending = pendingPayments.find((p) => p.planKey === pkg.slug || p.planKey === pkg.licenseLevel);

    let state: PackageDealerState = "PURCHASE";
    if (pkg.status !== "ACTIVE") {
      state = "INACTIVE";
    } else if (access?.status === "ACTIVE") {
      state = "ACCESSIBLE";
    } else if (access?.status === "PENDING" || pending) {
      state = "PENDING";
    } else if (pkg.isFree || pkg.billingType === "FREE") {
      state = canAccessPackageLevel(tier, pkg.licenseLevel as LicenseLevel) ? "ACCESSIBLE" : "PURCHASE";
    }

    return {
      ...pkg,
      dealerState: state,
      price: resolvePackagePrice(pkg),
      pendingPaymentId: pending?.id || null,
      accessStatus: access?.status || null,
    };
  });
}

export async function requestPackagePurchase(
  dealerId: string,
  packageId: string,
  options?: { paymentMethod?: ProductLibraryPaymentMethod }
) {
  const pkg = await prisma.productPackage.findUnique({ where: { id: packageId } });
  if (!pkg || pkg.status !== "ACTIVE") {
    throw new Error("Paket bulunamadı veya yayında değil");
  }

  const existingAccess = await getDealerPackageAccess(dealerId, packageId);
  if (existingAccess?.status === "ACTIVE") {
    throw new Error("Bu pakete zaten erişiminiz var");
  }

  const amount = resolvePackagePrice(pkg);
  const isFree = amount <= 0;

  if (isFree) {
    await prisma.productPackageAccess.upsert({
      where: { packageId_dealerId: { packageId, dealerId } },
      create: { packageId, dealerId, status: "ACTIVE", grantedBy: "free" },
      update: { status: "ACTIVE", grantedBy: "free" },
    });
    await upsertDealerModuleLicense(dealerId, {
      planKey: pkg.licenseLevel,
      status: "ACTIVE",
      startsAt: new Date(),
    });
    return { free: true as const, packageId };
  }

  const paymentMethod = options?.paymentMethod || "BANK_TRANSFER";
  const allowed = await assertPaymentMethodAllowed(dealerId, paymentMethod);
  if (!allowed.ok) {
    throw new Error(allowed.error || "Seçilen ödeme yöntemi kullanılamıyor");
  }

  const providerKey = resolveProviderKey(paymentMethod);
  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });

  let chargeAmount = amount;
  if (paymentMethod === "ESNEKPOS" || paymentMethod === "IYZICO") {
    const settings = await getPaymentSettings();
    chargeAmount = calculatePaymentTotal(amount, paymentMethod, settings).totalAmount;
  }

  if (paymentMethod === "BANK_TRANSFER") {
    const payment = await prisma.modulePayment.create({
      data: {
        dealerId,
        moduleKey: MODULE_KEY,
        planKey: pkg.slug,
        amount: chargeAmount,
        currency: "TRY",
        status: "MANUAL_REVIEW",
        provider: "MANUAL",
        paymentType: pkg.billingType === "YEARLY" ? "subscription" : "one_time",
        paymentDeadlineAt: paymentDeadlineFromNow(),
      },
    });

    await prisma.productPackageAccess.upsert({
      where: { packageId_dealerId: { packageId, dealerId } },
      create: { packageId, dealerId, status: "PENDING", grantedBy: `payment:${payment.id}` },
      update: { status: "PENDING", grantedBy: `payment:${payment.id}` },
    });

    await upsertDealerModuleLicense(dealerId, { planKey: pkg.slug, status: "PENDING_PAYMENT" });

    await notifyBankTransferCreated({
      dealerId,
      title: "Havale/EFT — dekont yükleyin",
      message: `${pkg.name} paketi için dekont yüklemeniz zorunludur. 24 saat içinde yüklenmezse işlem iptal edilir.`,
      link: "/dealer/product-library",
    });

    return { free: false as const, paymentId: payment.id, packageId, paymentMethod, redirectUrl: null };
  }

  const payment = await prisma.modulePayment.create({
    data: {
      dealerId,
      moduleKey: MODULE_KEY,
      planKey: pkg.slug,
      amount: chargeAmount,
      currency: "TRY",
      status: "WAITING_PAYMENT",
      provider: providerKey,
      paymentType: pkg.billingType === "YEARLY" ? "subscription" : "one_time",
    },
  });

  await prisma.productPackageAccess.upsert({
    where: { packageId_dealerId: { packageId, dealerId } },
    create: { packageId, dealerId, status: "PENDING", grantedBy: `payment:${payment.id}` },
    update: { status: "PENDING", grantedBy: `payment:${payment.id}` },
  });

  await upsertDealerModuleLicense(dealerId, { planKey: pkg.slug, status: "PENDING_PAYMENT" });

  const gatewayResult = await createPaymentIntent({
    dealerId,
    moduleKey: MODULE_KEY,
    planKey: pkg.slug,
    amount: chargeAmount,
    currency: "TRY",
    paymentType: "CARD",
    providerKey,
    metadata: {
      paymentId: payment.id,
      packageId,
      buyer: {
        id: dealerId,
        name: dealer?.name || dealer?.company || "Bayi",
        email: dealer?.email || "",
        phone: dealer?.phone || "5550000000",
      },
    },
  });

  if (!gatewayResult.success) {
    await prisma.modulePayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    throw new Error(gatewayResult.message || "Ödeme başlatılamadı");
  }

  return {
    free: false as const,
    paymentId: payment.id,
    packageId,
    paymentMethod,
    redirectUrl: gatewayResult.redirectUrl || null,
  };
}

export async function grantProductLibraryAccessFromPayment(paymentId: string) {
  const payment = await prisma.modulePayment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.moduleKey !== MODULE_KEY) return null;

  const pkg = await prisma.productPackage.findFirst({
    where: { OR: [{ slug: payment.planKey }, { licenseLevel: payment.planKey }] },
  });
  if (!pkg) return null;

  await prisma.productPackageAccess.upsert({
    where: { packageId_dealerId: { packageId: pkg.id, dealerId: payment.dealerId } },
    create: { packageId: pkg.id, dealerId: payment.dealerId, status: "ACTIVE", grantedBy: `payment:${payment.id}` },
    update: { status: "ACTIVE", grantedBy: `payment:${payment.id}` },
  });

  await upsertDealerModuleLicense(payment.dealerId, {
    planKey: payment.planKey,
    status: "ACTIVE",
    startsAt: new Date(),
  });

  return pkg;
}

export async function revokeProductLibraryAccessFromPayment(paymentId: string) {
  const payment = await prisma.modulePayment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.moduleKey !== MODULE_KEY) return null;

  const pkg = await prisma.productPackage.findFirst({
    where: { OR: [{ slug: payment.planKey }, { licenseLevel: payment.planKey }] },
  });
  if (pkg) {
    await prisma.productPackageAccess.updateMany({
      where: { packageId: pkg.id, dealerId: payment.dealerId, status: "PENDING" },
      data: { status: "REVOKED" },
    });
  }

  await upsertDealerModuleLicense(payment.dealerId, { planKey: payment.planKey, status: "INACTIVE" });
  return pkg;
}

export async function getProductLibraryOverview(dealerId: string) {
  const states = await getDealerPackageStates(dealerId);
  const activePackages = states.filter((p) => p.dealerState === "ACCESSIBLE");
  const pendingPayments = await prisma.modulePayment.count({
    where: { dealerId, moduleKey: MODULE_KEY, status: { in: ["PENDING", "WAITING_PAYMENT", "MANUAL_REVIEW"] } },
  });
  const lastDownload = await prisma.productDistributionLog.findFirst({
    where: { dealerId },
    orderBy: { createdAt: "desc" },
    include: { package: { select: { name: true } } },
  });

  return {
    packageCount: states.filter((p) => p.status === "ACTIVE").length,
    activePackageCount: activePackages.length,
    pendingPayments,
    lastDownloadAt: lastDownload?.createdAt || null,
    lastDownloadPackage: lastDownload?.package?.name || null,
  };
}
