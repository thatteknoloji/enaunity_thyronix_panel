import { prisma } from "@/lib/db";
import { buildReferralLink, buildReferralSlugLink } from "./referral";
import {
  createPartnerPayoutRequest,
  getPayoutSummary,
  getPartnerPayoutSettings,
  listAdminPayouts,
  listPartnerPayouts,
  updatePartnerPayoutAdmin,
  updatePartnerPayoutSettings,
} from "./payout-service";

/** PartnerCommission — DB model: AffiliateCommission */
export async function listReferralsForPartner(partnerId: string, limit = 50) {
  return prisma.affiliateReferral.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listCommissions(filters?: { partnerId?: string; status?: string }, limit = 100) {
  return prisma.affiliateCommission.findMany({
    where: {
      ...(filters?.partnerId ? { partnerId: filters.partnerId } : {}),
      ...(filters?.status ? { status: filters.status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { partner: true, referral: true },
  });
}

export async function listPayouts(partnerId?: string, limit = 100) {
  if (partnerId) return listPartnerPayouts(partnerId, limit);
  return prisma.affiliatePayout.findMany({
    orderBy: { requestedAt: "desc" },
    take: limit,
    include: { partner: true },
  });
}

export async function updateCommissionStatus(
  id: string,
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID"
) {
  const now = new Date();
  return prisma.affiliateCommission.update({
    where: { id },
    data: {
      status,
      ...(status === "APPROVED" ? { approvedAt: now } : {}),
      ...(status === "PAID" ? { paidAt: now, approvedAt: now } : {}),
    },
  });
}

export async function updatePayoutStatus(
  id: string,
  status: "REQUESTED" | "PROCESSING" | "PAID" | "REJECTED" | "CANCELLED",
  adminNote?: string
) {
  return updatePartnerPayoutAdmin({ id, status, adminNote });
}

export async function requestPayout(partnerId: string, amount: number, paymentMethod?: string) {
  const settings = await getPartnerPayoutSettings(partnerId);
  return createPartnerPayoutRequest({
    partnerId,
    amount,
    iban: settings.iban || "",
    accountHolder: settings.accountHolder || "",
    taxIdentityNumber: settings.taxIdentityNumber,
    note: paymentMethod ? `method:${paymentMethod}` : undefined,
  });
}

export {
  createPartnerPayoutRequest,
  getPayoutSummary,
  getPartnerPayoutSettings,
  listAdminPayouts,
  listPartnerPayouts,
  updatePartnerPayoutSettings,
  updateAdminPartnerPayoutRules,
  getPartnerDetailForAdmin,
  validateIban,
  normalizeIban,
} from "./payout-service";

export function getReferralLinkForProfile(referralCode: string, referralSlug?: string) {
  if (referralSlug) return buildReferralSlugLink(referralSlug);
  return buildReferralLink(referralCode);
}
