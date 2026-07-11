import { prisma } from "@/lib/db";
import { PLATFORM_CONTENT, type PlatformSlug } from "./platform-content";
import { serializeFeatures } from "./parse";

function buildSeedFromPlatform(slug: PlatformSlug, sortOrder: number) {
  const p = PLATFORM_CONTENT[slug];
  return {
    name: p.name,
    slug: p.slug,
    sortOrder,
    icon: p.icon,
    themeColor: p.themeColor,
    accentColor: p.accentColor,
    shortDescription: p.subtitle,
    longDescription: p.description,
    monthlyPrice: null,
    yearlyPrice: null,
    ctaText: "Keşfet",
    ctaUrl: `/platform/${p.slug}`,
    productUrl: `/platform/${p.slug}`,
    heroTitle: p.hero.title.replace("\n", " "),
    heroSubtitle: p.hero.subtitle,
    heroDescription: p.hero.description,
    badgeText: p.badgeText,
    featuresJson: serializeFeatures(
      p.cardFeatures,
      p.features.map((f) => ({ title: f.title, description: f.description, icon: f.icon }))
    ),
    faqJson: JSON.stringify(p.faq),
    plansJson: JSON.stringify(p.plans),
  };
}

const DEFAULTS = [
  buildSeedFromPlatform("ena", 0),
  buildSeedFromPlatform("thyronix", 1),
  buildSeedFromPlatform("hive", 2),
  buildSeedFromPlatform("linkslash", 3),
  buildSeedFromPlatform("page-factory", 4),
  buildSeedFromPlatform("product-library", 5),
  buildSeedFromPlatform("dropship", 6),
];

export async function ensureDefaultShowcaseProducts() {
  const count = await prisma.productShowcase.count();
  if (count > 0) return;
  for (const item of DEFAULTS) {
    await prisma.productShowcase.create({
      data: {
        status: "ACTIVE",
        isFeatured: true,
        galleryJson: "[]",
        comingSoonText: "Yakında",
        featuresSectionTitle: "Özellikler",
        plansSectionTitle: "Paketler",
        faqSectionTitle: "Sık Sorulan Sorular",
        gallerySectionTitle: "Galeri",
        maxCardChips: 8,
        showPriceOnCard: false,
        linkTarget: "_self",
        ...item,
      },
    });
  }
}

/** Built-in vitrin kartları: tıklama /platform/* ve aynı sekmede açılır */
export async function syncBuiltInShowcaseCardLinks() {
  for (const item of DEFAULTS) {
    await prisma.productShowcase.updateMany({
      where: { slug: item.slug },
      data: {
        ctaUrl: `/platform/${item.slug}`,
        productUrl: `/platform/${item.slug}`,
        linkTarget: "_self",
      },
    });
  }
}

/** Only creates missing built-in slugs — never overwrites admin edits */
export async function syncBuiltInShowcaseProducts() {
  for (const item of DEFAULTS) {
    const existing = await prisma.productShowcase.findUnique({ where: { slug: item.slug } });
    if (!existing) {
      await prisma.productShowcase.create({
        data: {
          status: "ACTIVE",
          isFeatured: true,
          galleryJson: "[]",
          comingSoonText: "Yakında",
          featuresSectionTitle: "Özellikler",
          plansSectionTitle: "Paketler",
          faqSectionTitle: "Sık Sorulan Sorular",
          gallerySectionTitle: "Galeri",
          maxCardChips: 8,
          showPriceOnCard: false,
          linkTarget: "_self",
          ...item,
        },
      });
    }
  }
}
