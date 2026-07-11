import { prisma } from "@/lib/db";
import { DEFAULT_BANNER_SLOTS, DEFAULT_HOME_CATEGORIES, DEFAULT_HERO } from "./defaults";
import { getAdminHomepageHeroes, getPublicBuilderHero, type HomepageHeroDTO } from "./heroes";

export type { HomepageHeroDTO, HomepageHeroButtonDTO } from "./heroes";

export type HomeCategoryDTO = {
  id: string;
  categoryName: string;
  title: string;
  sortOrder: number;
  maxProducts: number;
  active: boolean;
};

export type HomeBannerDTO = {
  id: string;
  slotKey: string;
  title: string;
  mediaType: string;
  imageDesktop: string;
  imageTablet: string;
  imageMobile: string;
  videoDesktop: string;
  videoMobile: string;
  linkUrl: string;
  linkTarget: string;
  sortOrder: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  campaignId: string | null;
  campaignName: string | null;
};

export type HomeBannerSlotDTO = {
  key: string;
  label: string;
  placement: string;
  categorySectionId: string | null;
  displayMode: string;
  gridColumns: number;
  autoplay: boolean;
  intervalMs: number;
  active: boolean;
  sortOrder: number;
  backgroundColor: string;
  contentAlign: string;
  mobileLayout: string;
  banners: HomeBannerDTO[];
};

export type HomeHeroDTO = {
  heroVideoDesktop: string;
  heroVideoMobile: string;
  heroPoster: string;
  heroBadge: string;
  heroDescription: string;
  heroCtaPrimaryLabel: string;
  heroCtaPrimaryUrl: string;
  heroCtaSecondaryLabel: string;
  heroCtaSecondaryUrl: string;
  useCustomHeroText: boolean;
};

function mapBanner(b: {
  id: string;
  slotKey: string;
  title: string;
  mediaType?: string;
  imageDesktop: string;
  imageTablet: string;
  imageMobile: string;
  videoDesktop?: string;
  videoMobile?: string;
  linkUrl: string;
  linkTarget: string;
  sortOrder: number;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  campaignId?: string | null;
  campaign?: { name: string } | null;
}): HomeBannerDTO {
  return {
    id: b.id,
    slotKey: b.slotKey,
    title: b.title,
    mediaType: b.mediaType || "image",
    imageDesktop: b.imageDesktop,
    imageTablet: b.imageTablet,
    imageMobile: b.imageMobile,
    videoDesktop: b.videoDesktop || "",
    videoMobile: b.videoMobile || "",
    linkUrl: b.linkUrl,
    linkTarget: b.linkTarget,
    sortOrder: b.sortOrder,
    active: b.active,
    startsAt: b.startsAt?.toISOString() ?? null,
    endsAt: b.endsAt?.toISOString() ?? null,
    campaignId: b.campaignId ?? null,
    campaignName: b.campaign?.name ?? null,
  };
}

function mapSlot(s: {
  key: string;
  label: string;
  placement: string;
  categorySectionId?: string | null;
  displayMode: string;
  gridColumns: number;
  autoplay: boolean;
  intervalMs: number;
  active: boolean;
  sortOrder: number;
  backgroundColor?: string;
  contentAlign?: string;
  mobileLayout?: string;
  banners: Parameters<typeof mapBanner>[0][];
}, now: Date): HomeBannerSlotDTO {
  return {
    key: s.key,
    label: s.label,
    placement: s.placement,
    categorySectionId: s.categorySectionId ?? null,
    displayMode: s.displayMode,
    gridColumns: s.gridColumns,
    autoplay: s.autoplay,
    intervalMs: s.intervalMs,
    active: s.active,
    sortOrder: s.sortOrder,
    backgroundColor: s.backgroundColor || "",
    contentAlign: s.contentAlign || "center",
    mobileLayout: s.mobileLayout || "default",
    banners: s.banners
      .filter((b) => b.active && isBannerLive(b.startsAt, b.endsAt, now))
      .map(mapBanner),
  };
}

function isBannerLive(startsAt: Date | null, endsAt: Date | null, now = new Date()) {
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
}

export async function ensureHomepageDefaults() {
  await prisma.homePageSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", ...DEFAULT_HERO },
  });

  const catCount = await prisma.homeCategorySection.count();
  if (catCount === 0) {
    await prisma.homeCategorySection.createMany({
      data: DEFAULT_HOME_CATEGORIES.map((categoryName, sortOrder) => ({
        categoryName,
        title: categoryName,
        sortOrder,
        maxProducts: 12,
        active: true,
      })),
    });
  }

  for (const slot of DEFAULT_BANNER_SLOTS) {
    await prisma.homeBannerSlot.upsert({
      where: { key: slot.key },
      update: {
        placement: slot.placement,
      },
      create: {
        key: slot.key,
        label: slot.label,
        placement: slot.placement,
        displayMode: slot.displayMode,
        gridColumns: "gridColumns" in slot ? slot.gridColumns : 2,
        sortOrder: slot.sortOrder,
        active: true,
        autoplay: true,
        intervalMs: 5000,
      },
    });
  }
}

export async function getHeroSettings(): Promise<HomeHeroDTO> {
  await ensureHomepageDefaults();
  const s = await prisma.homePageSettings.findUnique({ where: { id: "default" } });
  return {
    heroVideoDesktop: s?.heroVideoDesktop || DEFAULT_HERO.heroVideoDesktop,
    heroVideoMobile: s?.heroVideoMobile || DEFAULT_HERO.heroVideoMobile,
    heroPoster: s?.heroPoster || "",
    heroBadge: s?.heroBadge || "",
    heroDescription: s?.heroDescription || "",
    heroCtaPrimaryLabel: s?.heroCtaPrimaryLabel || "",
    heroCtaPrimaryUrl: s?.heroCtaPrimaryUrl || "/catalog",
    heroCtaSecondaryLabel: s?.heroCtaSecondaryLabel || "",
    heroCtaSecondaryUrl: s?.heroCtaSecondaryUrl || "/auth/register",
    useCustomHeroText: s?.useCustomHeroText ?? false,
  };
}

export async function updateHeroSettings(data: Partial<HomeHeroDTO>) {
  await ensureHomepageDefaults();
  return prisma.homePageSettings.update({
    where: { id: "default" },
    data,
  });
}

export async function getPublicHomepageConfig() {
  await ensureHomepageDefaults();
  const now = new Date();

  const [categories, slots, hero, builderHero] = await Promise.all([
    prisma.homeCategorySection.findMany({
      orderBy: { sortOrder: "asc" },
    }),
    prisma.homeBannerSlot.findMany({
      where: { active: true },
      orderBy: [{ placement: "asc" }, { sortOrder: "asc" }],
      include: {
        banners: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
    getHeroSettings(),
    getPublicBuilderHero(),
  ]);

  const mappedSlots = slots
    .map((s) => mapSlot(s, now))
    .filter((s) => s.banners.length > 0);

  return {
    hero,
    builderHero,
    categories: categories.map((c) => ({
      id: c.id,
      categoryName: c.categoryName,
      title: c.title || c.categoryName,
      sortOrder: c.sortOrder,
      maxProducts: c.maxProducts,
      active: c.active,
    })),
    slots: mappedSlots,
  };
}

export async function getAdminHomepageConfig() {
  await ensureHomepageDefaults();

  const [categories, slots, productCategories, hero, heroes] = await Promise.all([
    prisma.homeCategorySection.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.homeBannerSlot.findMany({
      orderBy: [{ placement: "asc" }, { sortOrder: "asc" }],
      include: { banners: { orderBy: { sortOrder: "asc" }, include: { campaign: { select: { name: true } } } } },
    }),
    prisma.product.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
    getHeroSettings(),
    getAdminHomepageHeroes(),
  ]);

  return {
    hero,
    heroes,
    categories,
    slots: slots.map((s) => ({
      ...s,
      banners: s.banners.map(mapBanner),
    })),
    availableCategories: productCategories.map((p) => p.category).filter(Boolean),
  };
}

export async function reorderHomeCategories(ids: string[]) {
  await Promise.all(
    ids.map((id, sortOrder) =>
      prisma.homeCategorySection.update({ where: { id }, data: { sortOrder } }),
    ),
  );
  return prisma.homeCategorySection.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function reorderHomeBanners(slotKey: string, ids: string[]) {
  await Promise.all(
    ids.map((id, sortOrder) =>
      prisma.homeBanner.update({ where: { id }, data: { sortOrder } }),
    ),
  );
  return prisma.homeBanner.findMany({ where: { slotKey }, orderBy: { sortOrder: "asc" } });
}

export async function createBannerSlot(data: {
  key: string;
  label: string;
  placement: string;
  categorySectionId?: string | null;
  displayMode?: string;
  gridColumns?: number;
  backgroundColor?: string;
  contentAlign?: string;
  mobileLayout?: string;
}) {
  const max = await prisma.homeBannerSlot.aggregate({ _max: { sortOrder: true } });
  return prisma.homeBannerSlot.create({
    data: {
      key: data.key,
      label: data.label,
      placement: data.placement,
      categorySectionId: data.categorySectionId || null,
      displayMode: data.displayMode || "carousel",
      gridColumns: data.gridColumns ?? 2,
      backgroundColor: data.backgroundColor || "",
      contentAlign: data.contentAlign || "center",
      mobileLayout: data.mobileLayout || "default",
      sortOrder: (max._max.sortOrder ?? -1) + 1,
      active: true,
      autoplay: true,
      intervalMs: 5000,
    },
  });
}

export async function bulkSetHomeCategoriesActive(active: boolean) {
  await prisma.homeCategorySection.updateMany({ data: { active } });
  return prisma.homeCategorySection.findMany({ orderBy: { sortOrder: "asc" } });
}
