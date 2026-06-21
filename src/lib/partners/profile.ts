import { prisma } from "@/lib/db";
import type { PartnerStatus, PartnerTypeV2 } from "./types";
import { DEFAULT_RATES, normalizePartnerType } from "./types";
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
  return prisma.partnerProfile.findUnique({
    where: { userId },
    include: { sponsorPartner: { select: { id: true, referralCode: true, partnerType: true } } },
  });
}

export async function getPartnerProfileById(id: string) {
  return prisma.partnerProfile.findUnique({ where: { id } });
}

export async function listPartnerProfiles(limit = 100) {
  return prisma.partnerProfile.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      _count: { select: { referrals: true, commissions: true, sponsoredPartners: true } },
    },
  });
}

export async function listPartnerNetwork(partnerId: string) {
  return prisma.partnerProfile.findMany({
    where: { sponsorPartnerId: partnerId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { referrals: true } } },
  });
}

export async function updatePartnerStatus(id: string, status: PartnerStatus) {
  return prisma.partnerProfile.update({ where: { id }, data: { status } });
}

export async function updatePartnerProfile(
  id: string,
  data: {
    partnerType?: PartnerTypeV2 | string;
    status?: PartnerStatus;
    sponsorPartnerId?: string | null;
    defaultCommissionRate?: number;
    moduleCommissionRate?: number;
    podCommissionRate?: number;
    networkOverrideRate?: number;
    commissionRate?: number;
    recurringCommissionRate?: number;
    metadataJson?: string;
  }
) {
  return prisma.partnerProfile.update({ where: { id }, data: data as never });
}

export async function refreshReferralCode(id: string) {
  const code = await generateUniqueReferralCode();
  const profile = await prisma.partnerProfile.findUnique({ where: { id } });
  if (!profile) throw new Error("Partner bulunamadı");
  const slug = await generateUniqueReferralSlug(profile.referralSlug.split("-")[0] || "partner");
  return prisma.partnerProfile.update({
    where: { id },
    data: { referralCode: code, referralSlug: slug },
  });
}

export async function applyDefaultRatesForType(partnerId: string, partnerType: string) {
  const type = normalizePartnerType(partnerType);
  const d = DEFAULT_RATES[type];
  return prisma.partnerProfile.update({
    where: { id: partnerId },
    data: {
      partnerType: type as never,
      defaultCommissionRate: d.firstOrder,
      recurringCommissionRate: d.recurringOrder,
      commissionRate: d.firstOrder,
      moduleCommissionRate: d.module,
      podCommissionRate: d.pod,
      networkOverrideRate: d.networkOverride,
    },
  });
}

export async function approvePartner(id: string, partnerType?: string) {
  const profile = await prisma.partnerProfile.findUnique({ where: { id } });
  if (!profile) throw new Error("Partner bulunamadı");
  const type = partnerType ? normalizePartnerType(partnerType) : normalizePartnerType(profile.partnerType);
  await applyDefaultRatesForType(id, type);
  return prisma.partnerProfile.update({
    where: { id },
    data: { status: "ACTIVE", partnerType: type as never },
  });
}

export async function assignSponsor(partnerId: string, sponsorPartnerId: string | null) {
  return prisma.partnerProfile.update({
    where: { id: partnerId },
    data: { sponsorPartnerId: sponsorPartnerId },
  });
}

export async function createPartnerFromApplication(input: {
  userId: string;
  dealerId?: string | null;
  partnerType: PartnerTypeV2 | string;
  sponsorPartnerId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const type = normalizePartnerType(input.partnerType);
  const existing = await getPartnerProfileByUserId(input.userId);
  if (existing) {
    await applyDefaultRatesForType(existing.id, type);
    return prisma.partnerProfile.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        partnerType: type as never,
        sponsorPartnerId: input.sponsorPartnerId || existing.sponsorPartnerId,
        metadataJson: JSON.stringify({ ...(JSON.parse(existing.metadataJson || "{}")), ...input.metadata }),
      },
    });
  }
  const created = await getOrCreatePartnerProfile(input.userId, input.dealerId, type, {
    activate: true,
    sponsorPartnerId: input.sponsorPartnerId || undefined,
  });
  await applyDefaultRatesForType(created.id, type);
  return prisma.partnerProfile.update({
    where: { id: created.id },
    data: { status: "ACTIVE" },
  });
}

export async function applyForPartner(userId: string, dealerId?: string | null, type = "SOCIAL_DEALER") {
  const existing = await getPartnerProfileByUserId(userId);
  if (existing) {
    if (existing.status === "REJECTED") {
      return prisma.partnerProfile.update({
        where: { id: existing.id },
        data: { status: "PENDING", partnerType: normalizePartnerType(type) as never },
      });
    }
    return existing;
  }
  return getOrCreatePartnerProfile(userId, dealerId, normalizePartnerType(type), { activate: false });
}
