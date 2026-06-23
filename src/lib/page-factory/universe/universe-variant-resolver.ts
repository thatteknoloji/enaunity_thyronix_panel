import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { UniverseBlueprintKind, UniversePageType } from "./universe-types";

export type ProductVariantSpec = {
  pageType: UniversePageType;
  blueprintKind: UniverseBlueprintKind;
  variantKey: string;
  titleSuffix: string;
  slugSuffix: string;
  intent: string;
  intentId?: string;
  categoryId?: string;
  targetQueryTemplate: (productName: string, categoryLabel?: string) => string;
};

/** Sabit çekirdek sayfa tipleri (ürün başına) */
const FIXED_CORE_VARIANTS: ProductVariantSpec[] = [
  {
    pageType: "product_detail",
    blueprintKind: "PRODUCT_DETAIL",
    variantKey: "default",
    titleSuffix: "",
    slugSuffix: "",
    intent: "commercial",
    targetQueryTemplate: (n) => n.toLowerCase(),
  },
  {
    pageType: "product_faq",
    blueprintKind: "PRODUCT_FAQ",
    variantKey: "default",
    titleSuffix: " — SSS",
    slugSuffix: "sss",
    intent: "informational",
    targetQueryTemplate: (n) => `${n.toLowerCase()} sık sorulan sorular`,
  },
  {
    pageType: "product_guide",
    blueprintKind: "PRODUCT_GUIDE",
    variantKey: "nasil-kullanilir",
    titleSuffix: " Nasıl Kullanılır?",
    slugSuffix: "nasil-kullanilir",
    intent: "howto",
    targetQueryTemplate: (n) => `${n.toLowerCase()} nasıl kullanılır`,
  },
  {
    pageType: "product_benefit",
    blueprintKind: "PRODUCT_BENEFIT",
    variantKey: "avantajlari",
    titleSuffix: " Avantajları",
    slugSuffix: "avantajlari",
    intent: "informational",
    targetQueryTemplate: (n) => `${n.toLowerCase()} avantajları`,
  },
  {
    pageType: "product_problem",
    blueprintKind: "PRODUCT_PROBLEM",
    variantKey: "sorun-cozumu",
    titleSuffix: " Sorun Çözümü",
    slugSuffix: "sorun-cozumu",
    intent: "problem",
    targetQueryTemplate: (n) => `${n.toLowerCase()} sorun çözümü`,
  },
];

const INTENT_SLUG_MAP: Record<string, string> = {
  bilgilendirici: "informational",
  "satin-alma": "commercial",
  "satın-alma": "commercial",
  ticari: "commercial",
  karsilastirma: "comparison",
  karşılaştırma: "comparison",
  bayilik: "commercial",
  toptan: "commercial",
  "fiyat-arastirmasi": "commercial",
  "fiyat-araştırması": "commercial",
  inceleme: "informational",
  yorum: "informational",
};

function mapIntentSlug(slug: string): string {
  return INTENT_SLUG_MAP[slug] || slugify(slug).replace(/-/g, "_") || "informational";
}

let cachedVariants: ProductVariantSpec[] | null = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

/** DB SearchIntent kataloğundan niyet varyantları + sabit çekirdek */
export async function resolveProductVariants(forceRefresh = false): Promise<ProductVariantSpec[]> {
  const now = Date.now();
  if (!forceRefresh && cachedVariants && now - cacheAt < CACHE_MS) {
    return cachedVariants;
  }

  const intents = await prisma.searchIntent.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const intentVariants: ProductVariantSpec[] = intents.map((intent) => ({
    pageType: "product_intent",
    blueprintKind: "PRODUCT_INTENT",
    variantKey: intent.slug,
    titleSuffix: ` — ${intent.name}`,
    slugSuffix: intent.slug,
    intent: mapIntentSlug(intent.slug),
    intentId: intent.id,
    targetQueryTemplate: (n, cat) =>
      `${n.toLowerCase()} ${intent.name.toLowerCase()}${cat ? ` ${cat.toLowerCase()}` : ""}`.trim(),
  }));

  // DB boşsa eski 3 intent fallback
  const fallbackIntents: ProductVariantSpec[] =
    intentVariants.length > 0
      ? []
      : [
          {
            pageType: "product_intent",
            blueprintKind: "PRODUCT_INTENT",
            variantKey: "nasil-secilir",
            titleSuffix: " Nasıl Seçilir?",
            slugSuffix: "nasil-secilir",
            intent: "commercial",
            targetQueryTemplate: (n) => `${n.toLowerCase()} nasıl seçilir`,
          },
          {
            pageType: "product_intent",
            blueprintKind: "PRODUCT_INTENT",
            variantKey: "en-iyi-mi",
            titleSuffix: " En İyi Mi?",
            slugSuffix: "en-iyi-mi",
            intent: "comparison",
            targetQueryTemplate: (n) => `${n.toLowerCase()} en iyi mi`,
          },
          {
            pageType: "product_intent",
            blueprintKind: "PRODUCT_INTENT",
            variantKey: "kime-uygun",
            titleSuffix: " Kime Uygun?",
            slugSuffix: "kime-uygun",
            intent: "informational",
            targetQueryTemplate: (n) => `${n.toLowerCase()} kime uygun`,
          },
        ];

  cachedVariants = [...FIXED_CORE_VARIANTS, ...intentVariants, ...fallbackIntents];
  cacheAt = now;
  return cachedVariants;
}

export async function resolveVariantsForMode(
  mode: string,
  includeGeo: boolean
): Promise<ProductVariantSpec[]> {
  const all = await resolveProductVariants();
  if (mode === "faq_only") return all.filter((v) => v.pageType === "product_faq");
  if (mode === "geo_only") return [];
  return all;
}

export function countCoreVariants(variants: ProductVariantSpec[]): number {
  return variants.filter((v) => v.pageType !== "product_geo").length;
}

let cachedCategories: Array<{ id: string; name: string; slug: string; industryName: string }> | null = null;
let categoryCacheAt = 0;

/** DB IndustryCategory kataloğu */
export async function resolveIndustryCategories(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedCategories && now - categoryCacheAt < CACHE_MS) {
    return cachedCategories;
  }
  const rows = await prisma.industryCategory.findMany({
    where: { isActive: true },
    include: { industry: { select: { name: true } } },
    orderBy: { name: "asc" },
    take: 200,
  });
  cachedCategories = rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    industryName: c.industry.name,
  }));
  categoryCacheAt = now;
  return cachedCategories;
}

/** Ürün categoryPath ile eşleşen DB kategorileri */
export function matchProductCategories(
  categoryPath: string,
  catalog: Array<{ id: string; name: string; slug: string; industryName: string }>
) {
  if (!categoryPath?.trim()) return [];
  const pathLower = categoryPath.toLowerCase();
  const segments = categoryPath.split(/[>/|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  return catalog.filter(
    (c) =>
      pathLower.includes(c.name.toLowerCase()) ||
      pathLower.includes(c.slug) ||
      segments.some((s) => s === c.name.toLowerCase() || s === c.slug)
  );
}

export function buildCategoryVariant(
  category: { id: string; name: string; slug: string },
  _productName: string
): ProductVariantSpec {
  return {
    pageType: "product_category",
    blueprintKind: "PRODUCT_CATEGORY",
    variantKey: category.slug,
    titleSuffix: category.name,
    slugSuffix: `kategori-${category.slug}`,
    intent: "commercial",
    categoryId: category.id,
    targetQueryTemplate: (_n, cat) => (cat || category.name).toLowerCase(),
  };
}
