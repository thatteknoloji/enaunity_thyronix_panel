import { prisma } from "@/lib/db";
import { resolveCampaignBannerLink } from "@/lib/campaigns/banner-link";
import { ensureHomepageDefaults } from "./service";

export async function syncCampaignHomeBanner(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { products: { select: { productId: true, type: true } } },
  });
  if (!campaign) return null;

  const existing = await prisma.homeBanner.findFirst({ where: { campaignId } });

  if (!campaign.showOnHomepage || !campaign.bannerImageDesktop) {
    if (existing) {
      await prisma.homeBanner.delete({ where: { id: existing.id } });
    }
    return null;
  }

  await ensureHomepageDefaults();

  const slot = await prisma.homeBannerSlot.findUnique({ where: { key: campaign.bannerSlotKey } });
  const slotKey = slot ? campaign.bannerSlotKey : "after_hero";
  const linkUrl = resolveCampaignBannerLink(campaign);

  const data = {
    slotKey,
    title: campaign.name,
    imageDesktop: campaign.bannerImageDesktop,
    imageTablet: campaign.bannerImageTablet || "",
    imageMobile: campaign.bannerImageMobile || "",
    linkUrl,
    linkTarget: "_self" as const,
    active: campaign.active,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    campaignId: campaign.id,
  };

  if (existing) {
    return prisma.homeBanner.update({ where: { id: existing.id }, data });
  }

  const max = await prisma.homeBanner.aggregate({
    where: { slotKey },
    _max: { sortOrder: true },
  });

  return prisma.homeBanner.create({
    data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 },
  });
}

export async function removeCampaignHomeBanner(campaignId: string) {
  await prisma.homeBanner.deleteMany({ where: { campaignId } });
}
