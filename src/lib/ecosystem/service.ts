import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { ProductShowcase } from "@prisma/client";
import { parseFeatures, parseFaq, parseGallery, parsePlans, serializeFeatures } from "./parse";
import type { ProductShowcaseDTO, ProductShowcaseInput, ShowcaseStatus } from "./types";
import { SHOWCASE_STATUSES } from "./types";
import { ensureDefaultShowcaseProducts, syncBuiltInShowcaseProducts } from "./seed-defaults";

export function toDTO(row: ProductShowcase): ProductShowcaseDTO {
  const { features, cardFeatures } = parseFeatures(row.featuresJson);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as ShowcaseStatus,
    sortOrder: row.sortOrder,
    isFeatured: row.isFeatured,
    icon: row.icon,
    themeColor: row.themeColor,
    accentColor: row.accentColor,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription,
    monthlyPrice: row.monthlyPrice,
    yearlyPrice: row.yearlyPrice,
    ctaText: row.ctaText,
    ctaUrl: row.ctaUrl,
    productUrl: row.productUrl,
    heroTitle: row.heroTitle,
    heroSubtitle: row.heroSubtitle,
    heroDescription: row.heroDescription,
    features,
    cardFeatures,
    faq: parseFaq(row.faqJson),
    plans: parsePlans(row.plansJson),
    gallery: parseGallery(row.galleryJson),
    badgeText: row.badgeText,
    comingSoonText: row.comingSoonText,
    featuresSectionTitle: row.featuresSectionTitle,
    plansSectionTitle: row.plansSectionTitle,
    faqSectionTitle: row.faqSectionTitle,
    gallerySectionTitle: row.gallerySectionTitle,
    maxCardChips: row.maxCardChips,
    showPriceOnCard: row.showPriceOnCard,
    linkTarget: row.linkTarget,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function slugify(v: string) {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildData(input: ProductShowcaseInput) {
  const data: Record<string, unknown> = {};
  const scalar = [
    "name", "slug", "status", "sortOrder", "isFeatured", "icon", "themeColor", "accentColor",
    "shortDescription", "longDescription", "monthlyPrice", "yearlyPrice", "ctaText", "ctaUrl",
    "productUrl", "heroTitle", "heroSubtitle", "heroDescription", "badgeText",
    "comingSoonText", "featuresSectionTitle", "plansSectionTitle", "faqSectionTitle",
    "gallerySectionTitle", "maxCardChips", "showPriceOnCard", "linkTarget",
  ] as const;
  for (const key of scalar) {
    if (input[key] !== undefined) data[key] = input[key];
  }
  if (input.slug) data.slug = slugify(input.slug);
  if (input.cardFeatures !== undefined || input.features !== undefined) {
    data.featuresJson = serializeFeatures(
      input.cardFeatures ?? [],
      input.features ?? []
    );
  }
  if (input.faq !== undefined) data.faqJson = JSON.stringify(input.faq);
  if (input.plans !== undefined) data.plansJson = JSON.stringify(input.plans);
  if (input.gallery !== undefined) data.galleryJson = JSON.stringify(input.gallery);
  return data;
}

function revalidateShowcasePaths(slug?: string) {
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/platform/${slug}`);
    revalidatePath(`/ecosystem/${slug}`);
  }
}

export async function listShowcaseProducts(opts?: { admin?: boolean; status?: ShowcaseStatus }) {
  await ensureDefaultShowcaseProducts();
  await syncBuiltInShowcaseProducts();
  const where = opts?.admin
    ? opts.status ? { status: opts.status } : {}
    : { status: { in: ["ACTIVE", "COMING_SOON"] } };
  const rows = await prisma.productShowcase.findMany({ where, orderBy: { sortOrder: "asc" } });
  return rows.map(toDTO);
}

export async function getShowcaseBySlug(slug: string, admin = false) {
  await ensureDefaultShowcaseProducts();
  const row = await prisma.productShowcase.findUnique({ where: { slug } });
  if (!row) return null;
  if (!admin && !["ACTIVE", "COMING_SOON"].includes(row.status)) return null;
  return toDTO(row);
}

export async function getShowcaseById(id: string) {
  const row = await prisma.productShowcase.findUnique({ where: { id } });
  return row ? toDTO(row) : null;
}

export async function createShowcase(input: ProductShowcaseInput) {
  const maxOrder = await prisma.productShowcase.aggregate({ _max: { sortOrder: true } });
  const sortOrder = input.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;
  const slug = slugify(input.slug || input.name || "product");
  const status = input.status && SHOWCASE_STATUSES.includes(input.status) ? input.status : "COMING_SOON";
  const row = await prisma.productShowcase.create({
    data: {
      name: input.name || "Yeni Ürün",
      slug,
      status,
      sortOrder,
      isFeatured: input.isFeatured ?? false,
      icon: input.icon || "Zap",
      themeColor: input.themeColor || "#3b82f6",
      accentColor: input.accentColor || "#60a5fa",
      shortDescription: input.shortDescription || "",
      longDescription: input.longDescription || "",
      monthlyPrice: input.monthlyPrice ?? null,
      yearlyPrice: input.yearlyPrice ?? null,
      ctaText: input.ctaText || "Keşfet",
      ctaUrl: input.ctaUrl || "",
      productUrl: input.productUrl || "",
      heroTitle: input.heroTitle || input.name || "",
      heroSubtitle: input.heroSubtitle || "",
      heroDescription: input.heroDescription || "",
      badgeText: input.badgeText || "",
      comingSoonText: input.comingSoonText || "Yakında",
      featuresSectionTitle: input.featuresSectionTitle || "Özellikler",
      plansSectionTitle: input.plansSectionTitle || "Paketler",
      faqSectionTitle: input.faqSectionTitle || "Sık Sorulan Sorular",
      gallerySectionTitle: input.gallerySectionTitle || "Galeri",
      maxCardChips: input.maxCardChips ?? 8,
      showPriceOnCard: input.showPriceOnCard ?? false,
      linkTarget: input.linkTarget || "_self",
      featuresJson: serializeFeatures(input.cardFeatures || [], input.features || []),
      faqJson: JSON.stringify(input.faq || []),
      plansJson: JSON.stringify(input.plans || []),
      galleryJson: JSON.stringify(input.gallery || []),
    },
  });
  revalidateShowcasePaths(slug);
  return toDTO(row);
}

export async function updateShowcase(id: string, input: ProductShowcaseInput) {
  const existing = await prisma.productShowcase.findUnique({ where: { id } });
  if (!existing) throw new Error("Ürün bulunamadı");
  const row = await prisma.productShowcase.update({ where: { id }, data: buildData(input) });
  revalidateShowcasePaths(row.slug);
  return toDTO(row);
}

export async function deleteShowcase(id: string) {
  const existing = await prisma.productShowcase.findUnique({ where: { id } });
  await prisma.productShowcase.delete({ where: { id } });
  revalidateShowcasePaths(existing?.slug);
}

export async function duplicateShowcase(id: string) {
  const src = await prisma.productShowcase.findUnique({ where: { id } });
  if (!src) throw new Error("Ürün bulunamadı");
  const maxOrder = await prisma.productShowcase.aggregate({ _max: { sortOrder: true } });
  const { id: _id, createdAt, updatedAt, slug, ...rest } = src;
  const row = await prisma.productShowcase.create({
    data: {
      ...rest,
      name: `${src.name} (Kopya)`,
      slug: `${slug}-copy-${Date.now().toString(36)}`,
      status: "HIDDEN",
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });
  return toDTO(row);
}

export async function reorderShowcase(ids: string[]) {
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.productShowcase.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  return listShowcaseProducts({ admin: true });
}
