import { prisma } from "@/lib/db";
import { DEFAULT_COMMISSION_RATES, type PartnerType } from "./types";
import { findActiveReferralForUser } from "./referral";

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function resolveCommissionRates(partner: {
  partnerType: PartnerType;
  commissionRate: number;
  recurringCommissionRate: number;
}) {
  const defaults = DEFAULT_COMMISSION_RATES[partner.partnerType] || DEFAULT_COMMISSION_RATES.AFFILIATE;
  return {
    first: partner.commissionRate > 0 ? partner.commissionRate : defaults.first,
    recurring: partner.recurringCommissionRate > 0 ? partner.recurringCommissionRate : defaults.recurring,
    module: defaults.module ?? defaults.first,
    pod: defaults.pod ?? 0,
  };
}

async function hasPriorOrderCommission(referralId: string): Promise<boolean> {
  const count = await prisma.affiliateCommission.count({
    where: {
      referralId,
      commissionType: { in: ["FIRST_ORDER", "RECURRING_ORDER"] },
      status: { not: "REJECTED" },
    },
  });
  return count > 0;
}

/** B2B sipariş tamamlandığında komisyon — bayi iskontosu baseAmount'tan düşülür */
export async function processOrderCommission(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      dealerId: true,
      total: true,
      discount: true,
      status: true,
    },
  });
  if (!order || !["delivered", "shipped", "approved"].includes(order.status)) return null;
  if (order.dealerId && order.userId) {
    // only process once per order
    const existing = await prisma.affiliateCommission.findFirst({
      where: { orderId: order.id, status: { not: "REJECTED" } },
    });
    if (existing) return existing;
  }

  const referral = await findActiveReferralForUser(order.userId, order.dealerId || undefined);
  if (!referral || referral.partner.status !== "ACTIVE") return null;

  const rates = resolveCommissionRates(referral.partner);
  const prior = referral.id ? await hasPriorOrderCommission(referral.id) : false;
  const commissionType = prior ? "RECURRING_ORDER" : "FIRST_ORDER";
  const rate = prior ? rates.recurring : rates.first;
  if (rate <= 0) return null;

  const baseAmount = Math.max(0, order.total - (order.discount || 0));
  const amount = roundMoney(baseAmount * rate);

  const commission = await prisma.affiliateCommission.create({
    data: {
      partnerId: referral.partnerId,
      referralId: referral.id,
      orderId: order.id,
      commissionType,
      baseAmount,
      rate,
      amount,
      status: "PENDING",
      note: prior ? "Tekrarlayan sipariş komisyonu" : "İlk sipariş komisyonu",
    },
  });

  await prisma.affiliateReferral.update({
    where: { id: referral.id },
    data: {
      status: prior ? "CONVERTED" : "FIRST_ORDER",
      convertedAt: new Date(),
    },
  });

  return commission;
}

/** Modül lisans ödemesi tamamlandığında */
export async function processModuleLicenseCommission(input: {
  dealerId: string;
  moduleLicenseId: string;
  moduleKey: string;
  amount: number;
}) {
  const dealerUser = await prisma.user.findFirst({
    where: { dealerId: input.dealerId },
    select: { id: true },
  });
  if (!dealerUser) return null;

  const referral = await findActiveReferralForUser(dealerUser.id, input.dealerId);
  if (!referral || referral.partner.status !== "ACTIVE") return null;

  const rates = resolveCommissionRates(referral.partner);
  const rate =
    referral.partner.partnerType === "AI_PARTNER"
      ? rates.module
      : rates.module || rates.first;
  if (rate <= 0) return null;

  const existing = await prisma.affiliateCommission.findFirst({
    where: { moduleLicenseId: input.moduleLicenseId },
  });
  if (existing) return existing;

  const amount = roundMoney(input.amount * rate);

  const commission = await prisma.affiliateCommission.create({
    data: {
      partnerId: referral.partnerId,
      referralId: referral.id,
      moduleLicenseId: input.moduleLicenseId,
      commissionType: "MODULE_LICENSE",
      baseAmount: input.amount,
      rate,
      amount,
      status: "PENDING",
      note: `${input.moduleKey} modül lisansı`,
    },
  });

  await prisma.affiliateReferral.update({
    where: { id: referral.id },
    data: { status: "LICENSED" },
  });

  return commission;
}

export async function getPartnerStats(partnerId: string) {
  const [visits, registrations, orders, pending, approved, paid] = await Promise.all([
    prisma.affiliateReferral.count({ where: { partnerId, status: "VISIT" } }),
    prisma.affiliateReferral.count({
      where: { partnerId, status: { in: ["REGISTERED", "LICENSED", "FIRST_ORDER", "CONVERTED"] } },
    }),
    prisma.affiliateReferral.count({
      where: { partnerId, status: { in: ["FIRST_ORDER", "CONVERTED"] } },
    }),
    prisma.affiliateCommission.aggregate({
      where: { partnerId, status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.affiliateCommission.aggregate({
      where: { partnerId, status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.affiliateCommission.aggregate({
      where: { partnerId, status: "PAID" },
      _sum: { amount: true },
    }),
  ]);

  return {
    visits,
    registrations,
    orders,
    pendingCommission: pending._sum.amount || 0,
    approvedCommission: approved._sum.amount || 0,
    paidCommission: paid._sum.amount || 0,
  };
}
