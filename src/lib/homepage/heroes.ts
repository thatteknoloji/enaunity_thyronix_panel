import { prisma } from "@/lib/db";
import {
  parseTitleSegments,
  serializeTitleSegments,
  titleFromSegments,
  type HeroTitleSegment,
} from "./hero-presets";

export type { HeroTitleSegment } from "./hero-presets";

export type HomepageHeroButtonDTO = {
  id: string;
  heroId: string;
  label: string;
  href: string;
  icon: string;
  variant: "primary" | "secondary" | "ghost";
  isActive: boolean;
  sortOrder: number;
};

export type HomepageHeroDTO = {
  id: string;
  eyebrowText: string;
  title: string;
  subtitle: string;
  titleSegments: HeroTitleSegment[];
  titleFont: string;
  eyebrowFont: string;
  subtitleFont: string;
  showTrademark: boolean;
  eyebrowColor: string;
  subtitleColor: string;
  titleSize: string;
  textAlign: string;
  heroHeight: string;
  backgroundImageUrl: string;
  backgroundImageMobileUrl: string;
  overlayOpacity: number;
  isActive: boolean;
  sortOrder: number;
  buttons: HomepageHeroButtonDTO[];
  createdAt: string;
  updatedAt: string;
};

type ButtonInput = {
  id?: string;
  label?: string;
  href?: string;
  icon?: string;
  variant?: string;
  isActive?: boolean;
  sortOrder?: number;
};

type HeroStyleInput = {
  titleSegments?: HeroTitleSegment[];
  titleSegmentsJson?: string;
  titleFont?: string;
  eyebrowFont?: string;
  subtitleFont?: string;
  showTrademark?: boolean;
  eyebrowColor?: string;
  subtitleColor?: string;
  titleSize?: string;
  textAlign?: string;
  heroHeight?: string;
  backgroundImageMobileUrl?: string;
};

const VARIANTS = new Set(["primary", "secondary", "ghost"]);
const TITLE_SIZES = new Set(["sm", "md", "lg", "xl"]);
const TEXT_ALIGNS = new Set(["left", "center"]);
const HERO_HEIGHTS = new Set(["md", "lg", "xl", "full"]);

function mapButton(b: {
  id: string;
  heroId: string;
  label: string;
  href: string;
  icon: string;
  variant: string;
  isActive: boolean;
  sortOrder: number;
}): HomepageHeroButtonDTO {
  return {
    id: b.id,
    heroId: b.heroId,
    label: b.label,
    href: b.href,
    icon: b.icon || "Play",
    variant: VARIANTS.has(b.variant) ? (b.variant as HomepageHeroButtonDTO["variant"]) : "primary",
    isActive: b.isActive,
    sortOrder: b.sortOrder,
  };
}

function mapHero(h: {
  id: string;
  eyebrowText: string;
  title: string;
  subtitle: string;
  titleSegmentsJson: string;
  titleFont: string;
  eyebrowFont: string;
  subtitleFont: string;
  showTrademark: boolean;
  eyebrowColor: string;
  subtitleColor: string;
  titleSize: string;
  textAlign: string;
  heroHeight: string;
  backgroundImageUrl: string;
  backgroundImageMobileUrl: string;
  overlayOpacity: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  buttons: Parameters<typeof mapButton>[0][];
}): HomepageHeroDTO {
  const titleSegments = parseTitleSegments(h.titleSegmentsJson, h.title);
  return {
    id: h.id,
    eyebrowText: h.eyebrowText,
    title: h.title || titleFromSegments(titleSegments),
    subtitle: h.subtitle,
    titleSegments,
    titleFont: h.titleFont || "geist-black",
    eyebrowFont: h.eyebrowFont || "geist-sans",
    subtitleFont: h.subtitleFont || "geist-sans",
    showTrademark: h.showTrademark,
    eyebrowColor: h.eyebrowColor || "#e50914",
    subtitleColor: h.subtitleColor || "",
    titleSize: TITLE_SIZES.has(h.titleSize) ? h.titleSize : "xl",
    textAlign: TEXT_ALIGNS.has(h.textAlign) ? h.textAlign : "left",
    heroHeight: HERO_HEIGHTS.has(h.heroHeight) ? h.heroHeight : "lg",
    backgroundImageUrl: h.backgroundImageUrl,
    backgroundImageMobileUrl: h.backgroundImageMobileUrl || "",
    overlayOpacity: h.overlayOpacity,
    isActive: h.isActive,
    sortOrder: h.sortOrder,
    buttons: h.buttons.map(mapButton),
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
  };
}

function applyStyleFields(data: Record<string, unknown>, input: HeroStyleInput & { title?: string }) {
  let segments: HeroTitleSegment[] | undefined;
  if (input.titleSegments?.length) {
    segments = input.titleSegments;
  } else if (input.titleSegmentsJson !== undefined) {
    segments = parseTitleSegments(input.titleSegmentsJson, input.title || "");
  }
  if (segments) {
    data.titleSegmentsJson = serializeTitleSegments(segments);
    data.title = titleFromSegments(segments);
  } else if (input.title !== undefined) {
    data.title = input.title.trim();
    data.titleSegmentsJson = serializeTitleSegments(parseTitleSegments("", input.title.trim()));
  }
  if (input.titleFont !== undefined) data.titleFont = input.titleFont;
  if (input.eyebrowFont !== undefined) data.eyebrowFont = input.eyebrowFont;
  if (input.subtitleFont !== undefined) data.subtitleFont = input.subtitleFont;
  if (input.showTrademark !== undefined) data.showTrademark = input.showTrademark;
  if (input.eyebrowColor !== undefined) data.eyebrowColor = input.eyebrowColor.trim();
  if (input.subtitleColor !== undefined) data.subtitleColor = input.subtitleColor.trim();
  if (input.titleSize !== undefined) data.titleSize = TITLE_SIZES.has(input.titleSize) ? input.titleSize : "xl";
  if (input.textAlign !== undefined) data.textAlign = TEXT_ALIGNS.has(input.textAlign) ? input.textAlign : "left";
  if (input.heroHeight !== undefined) data.heroHeight = HERO_HEIGHTS.has(input.heroHeight) ? input.heroHeight : "lg";
  if (input.backgroundImageMobileUrl !== undefined) data.backgroundImageMobileUrl = input.backgroundImageMobileUrl.trim();
}

export async function getAdminHomepageHeroes(): Promise<HomepageHeroDTO[]> {
  const rows = await prisma.homepageHero.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { buttons: { orderBy: { sortOrder: "asc" } } },
  });
  return rows.map(mapHero);
}

export async function getPublicBuilderHero(): Promise<HomepageHeroDTO | null> {
  const row = await prisma.homepageHero.findFirst({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      buttons: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return row ? mapHero(row) : null;
}

export async function createHomepageHero(
  input: HeroStyleInput & {
    eyebrowText?: string;
    title?: string;
    subtitle?: string;
    backgroundImageUrl?: string;
    overlayOpacity?: number;
    isActive?: boolean;
    sortOrder?: number;
    buttons?: ButtonInput[];
  },
) {
  const max = await prisma.homepageHero.aggregate({ _max: { sortOrder: true } });
  const styleData: Record<string, unknown> = {};
  applyStyleFields(styleData, input);

  const hero = await prisma.homepageHero.create({
    data: {
      eyebrowText: input.eyebrowText?.trim() || "",
      title: (styleData.title as string) || input.title?.trim() || "",
      subtitle: input.subtitle?.trim() || "",
      titleSegmentsJson: (styleData.titleSegmentsJson as string) || serializeTitleSegments(parseTitleSegments("", input.title || "")),
      titleFont: (styleData.titleFont as string) || "geist-black",
      eyebrowFont: (styleData.eyebrowFont as string) || "geist-sans",
      subtitleFont: (styleData.subtitleFont as string) || "geist-sans",
      showTrademark: (styleData.showTrademark as boolean | undefined) ?? true,
      eyebrowColor: (styleData.eyebrowColor as string) || "#e50914",
      subtitleColor: (styleData.subtitleColor as string) || "",
      titleSize: (styleData.titleSize as string) || "xl",
      textAlign: (styleData.textAlign as string) || "left",
      heroHeight: (styleData.heroHeight as string) || "lg",
      backgroundImageUrl: input.backgroundImageUrl?.trim() || "",
      backgroundImageMobileUrl: (styleData.backgroundImageMobileUrl as string) || "",
      overlayOpacity: clampOpacity(input.overlayOpacity ?? 0.5),
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? (max._max.sortOrder ?? -1) + 1,
      buttons: input.buttons?.length
        ? {
            create: input.buttons.map((b, i) => ({
              label: b.label?.trim() || "",
              href: b.href?.trim() || "/",
              icon: b.icon?.trim() || "Play",
              variant: VARIANTS.has(b.variant || "") ? b.variant! : "primary",
              isActive: b.isActive ?? true,
              sortOrder: b.sortOrder ?? i,
            })),
          }
        : undefined,
    },
    include: { buttons: { orderBy: { sortOrder: "asc" } } },
  });
  return mapHero(hero);
}

export async function updateHomepageHero(
  id: string,
  input: HeroStyleInput & {
    eyebrowText?: string;
    title?: string;
    subtitle?: string;
    backgroundImageUrl?: string;
    overlayOpacity?: number;
    isActive?: boolean;
    sortOrder?: number;
    buttons?: ButtonInput[];
  },
) {
  const data: Record<string, unknown> = {};
  if (input.eyebrowText !== undefined) data.eyebrowText = input.eyebrowText.trim();
  if (input.subtitle !== undefined) data.subtitle = input.subtitle.trim();
  if (input.backgroundImageUrl !== undefined) data.backgroundImageUrl = input.backgroundImageUrl.trim();
  if (input.overlayOpacity !== undefined) data.overlayOpacity = clampOpacity(input.overlayOpacity);
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  applyStyleFields(data, input);

  await prisma.$transaction(async (tx) => {
    await tx.homepageHero.update({ where: { id }, data });

    if (input.buttons !== undefined) {
      await tx.homepageHeroButton.deleteMany({ where: { heroId: id } });
      if (input.buttons.length > 0) {
        await tx.homepageHeroButton.createMany({
          data: input.buttons.map((b, i) => ({
            heroId: id,
            label: b.label?.trim() || "",
            href: b.href?.trim() || "/",
            icon: b.icon?.trim() || "Play",
            variant: VARIANTS.has(b.variant || "") ? b.variant! : "primary",
            isActive: b.isActive ?? true,
            sortOrder: b.sortOrder ?? i,
          })),
        });
      }
    }
  });

  const hero = await prisma.homepageHero.findUniqueOrThrow({
    where: { id },
    include: { buttons: { orderBy: { sortOrder: "asc" } } },
  });
  return mapHero(hero);
}

export async function deleteHomepageHero(id: string) {
  await prisma.homepageHero.delete({ where: { id } });
}

export async function reorderHomepageHeroes(ids: string[]) {
  await Promise.all(
    ids.map((id, sortOrder) => prisma.homepageHero.update({ where: { id }, data: { sortOrder } })),
  );
  return getAdminHomepageHeroes();
}

function clampOpacity(value: number) {
  if (Number.isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}
