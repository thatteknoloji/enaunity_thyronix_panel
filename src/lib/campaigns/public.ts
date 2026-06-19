import { prisma } from "@/lib/db";

function isCampaignLive(startsAt: Date | null, endsAt: Date | null, now = new Date()) {
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
}

export async function getPublicCampaignById(id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, active: true },
    include: {
      products: { select: { productId: true, type: true } },
    },
  });

  if (!campaign || !isCampaignLive(campaign.startsAt, campaign.endsAt)) return null;

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    type: campaign.type,
    discountType: campaign.discountType,
    discountValue: campaign.discountValue,
    badge: campaign.badge,
    badgeColor: campaign.badgeColor,
    categoryScope: campaign.categoryScope,
    startsAt: campaign.startsAt?.toISOString() ?? null,
    endsAt: campaign.endsAt?.toISOString() ?? null,
    freeShipping: campaign.freeShipping,
    products: campaign.products,
  };
}
