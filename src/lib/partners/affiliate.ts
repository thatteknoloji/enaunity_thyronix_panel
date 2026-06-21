import { prisma } from "@/lib/db";
import { buildReferralLink, buildReferralSlugLink } from "./referral";

export async function listReferralsForPartner(partnerId: string, limit = 50) {
  return prisma.affiliateReferral.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listCommissions(
  filters?: { partnerId?: string; status?: string },
  limit = 100
) {
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
  return prisma.affiliatePayout.findMany({
    where: partnerId ? { partnerId } : undefined,
    orderBy: { createdAt: "desc" },
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
  status: "REQUESTED" | "PROCESSING" | "PAID" | "CANCELLED",
  paymentNote?: string
) {
  return prisma.affiliatePayout.update({
    where: { id },
    data: {
      status,
      paymentNote: paymentNote || undefined,
      ...(status === "PAID" ? { paidAt: new Date() } : {}),
    },
  });
}

export function getReferralLinkForProfile(referralCode: string, referralSlug?: string) {
  if (referralSlug) return buildReferralSlugLink(referralSlug);
  return buildReferralLink(referralCode);
}
