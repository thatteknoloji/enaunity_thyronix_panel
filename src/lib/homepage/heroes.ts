import { prisma } from "@/lib/db";

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
  backgroundImageUrl: string;
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

const VARIANTS = new Set(["primary", "secondary", "ghost"]);

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
  backgroundImageUrl: string;
  overlayOpacity: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  buttons: Parameters<typeof mapButton>[0][];
}): HomepageHeroDTO {
  return {
    id: h.id,
    eyebrowText: h.eyebrowText,
    title: h.title,
    subtitle: h.subtitle,
    backgroundImageUrl: h.backgroundImageUrl,
    overlayOpacity: h.overlayOpacity,
    isActive: h.isActive,
    sortOrder: h.sortOrder,
    buttons: h.buttons.map(mapButton),
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
  };
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

export async function createHomepageHero(input: {
  eyebrowText?: string;
  title?: string;
  subtitle?: string;
  backgroundImageUrl?: string;
  overlayOpacity?: number;
  isActive?: boolean;
  sortOrder?: number;
  buttons?: ButtonInput[];
}) {
  const max = await prisma.homepageHero.aggregate({ _max: { sortOrder: true } });
  const hero = await prisma.homepageHero.create({
    data: {
      eyebrowText: input.eyebrowText?.trim() || "",
      title: input.title?.trim() || "",
      subtitle: input.subtitle?.trim() || "",
      backgroundImageUrl: input.backgroundImageUrl?.trim() || "",
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
  input: {
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
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.subtitle !== undefined) data.subtitle = input.subtitle.trim();
  if (input.backgroundImageUrl !== undefined) data.backgroundImageUrl = input.backgroundImageUrl.trim();
  if (input.overlayOpacity !== undefined) data.overlayOpacity = clampOpacity(input.overlayOpacity);
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

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
