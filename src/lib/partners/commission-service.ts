import { prisma } from "@/lib/db";
import { resolvePartnerRates, normalizePartnerType } from "./types";
import { findActiveReferralForUser } from "./referral";

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

async function hasPriorOrderCommission(referralId: string): Promise<boolean> {
  const count = await prisma.affiliateCommission.count({
    where: {
      referralId,
      commissionType: { in: ["FIRST_ORDER", "RECURRING_ORDER", "PRODUCT_ORDER"] },
      status: { not: "REJECTED" },
    },
  });
  return count > 0;
}

/** Sponsor override — tek kat */
async function processNetworkOverride(input: {
  sponsorPartnerId: string;
  baseAmount: number;
  sourceNote: string;
  orderId?: string;
  moduleLicenseId?: string;
}) {
  const sponsor = await prisma.partnerProfile.findUnique({ where: { id: input.sponsorPartnerId } });
  if (!sponsor || sponsor.status !== "ACTIVE") return null;

  const rates = resolvePartnerRates(sponsor);
  if (rates.networkOverride <= 0) return null;

  const amount = roundMoney(input.baseAmount * rates.networkOverride);
  return prisma.affiliateCommission.create({
    data: {
      partnerId: sponsor.id,
      orderId: input.orderId,
      moduleLicenseId: input.moduleLicenseId,
      commissionType: "NETWORK_OVERRIDE",
      baseAmount: input.baseAmount,
      rate: rates.networkOverride,
      amount,
      status: "PENDING",
      note: input.sourceNote,
    },
  });
}

export async function processOrderCommission(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, dealerId: true, total: true, discount: true, status: true },
  });
  if (!order || !["delivered", "shipped", "approved"].includes(order.status)) return null;

  const existing = await prisma.affiliateCommission.findFirst({
    where: { orderId: order.id, commissionType: { in: ["FIRST_ORDER", "RECURRING_ORDER", "PRODUCT_ORDER"] }, status: { not: "REJECTED" } },
  });
  if (existing) return existing;

  const referral = await findActiveReferralForUser(order.userId, order.dealerId || undefined);
  if (!referral || referral.partner.status !== "ACTIVE") return null;

  const rates = resolvePartnerRates(referral.partner);
  const prior = referral.id ? await hasPriorOrderCommission(referral.id) : false;
  const commissionType = prior ? "RECURRING_ORDER" : "FIRST_ORDER";
  const rate = prior ? rates.recurringOrder : rates.firstOrder;
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
    data: { status: prior ? "CONVERTED" : "FIRST_ORDER", convertedAt: new Date() },
  });

  // Sponsor override
  const referredProfile = await prisma.partnerProfile.findFirst({
    where: { OR: [{ userId: order.userId }, ...(order.dealerId ? [{ dealerId: order.dealerId }] : [])] },
  });
  if (referredProfile?.sponsorPartnerId) {
    await processNetworkOverride({
      sponsorPartnerId: referredProfile.sponsorPartnerId,
      baseAmount,
      sourceNote: "Referans ağı override",
      orderId: order.id,
    });
  }

  return commission;
}

export async function processModuleLicenseCommission(input: {
  dealerId: string;
  moduleLicenseId: string;
  moduleKey: string;
  amount: number;
}) {
  const dealerUser = await prisma.user.findFirst({ where: { dealerId: input.dealerId }, select: { id: true } });
  if (!dealerUser) return null;

  const referral = await findActiveReferralForUser(dealerUser.id, input.dealerId);
  if (!referral || referral.partner.status !== "ACTIVE") return null;

  const rates = resolvePartnerRates(referral.partner);
  const type = normalizePartnerType(referral.partner.partnerType);
  const rate = type === "AI_PARTNER" ? rates.module : rates.module || rates.firstOrder;
  if (rate <= 0) return null;

  const existing = await prisma.affiliateCommission.findFirst({ where: { moduleLicenseId: input.moduleLicenseId } });
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

  await prisma.affiliateReferral.update({ where: { id: referral.id }, data: { status: "LICENSED" } });

  const referredProfile = await prisma.partnerProfile.findFirst({ where: { userId: dealerUser.id } });
  if (referredProfile?.sponsorPartnerId) {
    await processNetworkOverride({
      sponsorPartnerId: referredProfile.sponsorPartnerId,
      baseAmount: input.amount,
      sourceNote: `${input.moduleKey} modül override`,
      moduleLicenseId: input.moduleLicenseId,
    });
  }

  return commission;
}

export async function getPartnerStats(partnerId: string) {
  const [visits, registrations, networkCount, pending, approved, paid, totalEarned] = await Promise.all([
    prisma.affiliateReferral.count({ where: { partnerId, status: "VISIT" } }),
    prisma.affiliateReferral.count({
      where: { partnerId, status: { in: ["REGISTERED", "LICENSED", "FIRST_ORDER", "CONVERTED"] } },
    }),
    prisma.partnerProfile.count({ where: { sponsorPartnerId: partnerId } }),
    prisma.affiliateCommission.aggregate({ where: { partnerId, status: "PENDING" }, _sum: { amount: true } }),
    prisma.affiliateCommission.aggregate({ where: { partnerId, status: "APPROVED" }, _sum: { amount: true } }),
    prisma.affiliateCommission.aggregate({ where: { partnerId, status: "PAID" }, _sum: { amount: true } }),
    prisma.affiliateCommission.aggregate({
      where: { partnerId, status: { in: ["APPROVED", "PAID"] } },
      _sum: { amount: true },
    }),
  ]);

  return {
    visits,
    registrations,
    networkCount,
    orders: registrations,
    pendingCommission: pending._sum.amount || 0,
    approvedCommission: approved._sum.amount || 0,
    paidCommission: paid._sum.amount || 0,
    totalEarned: totalEarned._sum.amount || 0,
  };
}

/** @alias PartnerCommission service */
export {
  listCommissions,
  listPayouts,
  listReferralsForPartner,
  updateCommissionStatus,
  updatePayoutStatus,
  getReferralLinkForProfile,
} from "./partner-commissions";
