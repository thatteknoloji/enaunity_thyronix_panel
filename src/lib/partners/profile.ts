import { prisma } from "@/lib/db";
import type { PartnerStatus, PartnerType } from "./types";
import {
  buildReferralLink,
  buildReferralSlugLink,
  generateUniqueReferralCode,
  generateUniqueReferralSlug,
  getOrCreatePartnerProfile,
} from "./referral";

export {
  buildReferralLink,
  buildReferralSlugLink,
  getOrCreatePartnerProfile,
  generateUniqueReferralCode,
  generateUniqueReferralSlug,
};

export async function getPartnerProfileByUserId(userId: string) {
  return prisma.partnerProfile.findUnique({ where: { userId } });
}

export async function listPartnerProfiles(limit = 100) {
  return prisma.partnerProfile.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      _count: { select: { referrals: true, commissions: true } },
    },
  });
}

export async function updatePartnerStatus(id: string, status: PartnerStatus) {
  return prisma.partnerProfile.update({ where: { id }, data: { status } });
}

export async function updatePartnerRates(
  id: string,
  rates: { commissionRate?: number; recurringCommissionRate?: number }
) {
  return prisma.partnerProfile.update({ where: { id }, data: rates });
}

export async function applyForPartner(userId: string, dealerId?: string | null, type: PartnerType = "AFFILIATE") {
  const existing = await getPartnerProfileByUserId(userId);
  if (existing) {
    if (existing.status === "REJECTED") {
      return prisma.partnerProfile.update({
        where: { id: existing.id },
        data: { status: "PENDING", partnerType: type },
      });
    }
    return existing;
  }
  return getOrCreatePartnerProfile(userId, dealerId, type, { activate: false });
}

export async function approvePartner(id: string) {
  return prisma.partnerProfile.update({
    where: { id },
    data: { status: "ACTIVE" },
  });
}
