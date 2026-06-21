import { prisma } from "@/lib/db";

export type TrustBadge = { icon: string; text: string };

export type ResolvedProductPresentation = {
  badge: string | null;
  subtitle: string | null;
  shortDescription: string | null;
  highlights: string[];
  trustBadges: TrustBadge[];
  showShortOnCatalog: boolean;
};

export const DEFAULT_TRUST_BADGES: TrustBadge[] = [
  { icon: "Truck", text: "Ücretsiz Kargo (1000TL+ B4B)" },
  { icon: "RefreshCw", text: "30 Gün İade" },
  { icon: "ShieldCheck", text: "Kurumsal Fatura" },
  { icon: "Headphones", text: "7/24 Destek" },
];

export const DEFAULT_CATEGORY_HIGHLIGHTS: Record<string, string[]> = {
  "Cam Tablo": [
    "Yüksek kaliteli malzeme",
    "Özel tasarım",
    "Kolay temizlenebilir",
    "Dayanıklı yapı",
  ],
};

function parseStringArray(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function parseTrustBadges(raw: unknown): TrustBadge[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        icon: String(item?.icon || "Package").trim(),
        text: String(item?.text || "").trim(),
      }))
      .filter((b) => b.text);
  } catch {
    return [];
  }
}

export function serializeTrustBadges(badges: TrustBadge[]): string {
  return JSON.stringify(badges.filter((b) => b.text.trim()));
}

export function serializeHighlights(items: string[]): string {
  return JSON.stringify(items.map((s) => s.trim()).filter(Boolean));
}

function firstNonEmpty(...values: (string | null | undefined)[]): string {
  for (const v of values) {
    const t = (v || "").trim();
    if (t) return t;
  }
  return "";
}

export async function getProductPageSettings() {
  let row = await prisma.productPageSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    row = await prisma.productPageSettings.create({
      data: {
        id: "default",
        defaultBadgeText: "B4B Ürün",
        trustBadgesJson: serializeTrustBadges(DEFAULT_TRUST_BADGES),
        showShortOnCatalog: true,
      },
    });
  }
  return row;
}

export async function ensureCategoryPresentationDefaults() {
  for (const [category, highlights] of Object.entries(DEFAULT_CATEGORY_HIGHLIGHTS)) {
    const existing = await prisma.productCategoryPresentation.findUnique({ where: { category } });
    if (!existing) {
      await prisma.productCategoryPresentation.create({
        data: {
          category,
          highlightsJson: serializeHighlights(highlights),
        },
      });
    }
  }
}

type ProductPresentationSource = {
  category: string;
  subtitle?: string | null;
  shortDescription?: string | null;
  badgeText?: string | null;
  highlightsJson?: string | null;
  trustBadgesJson?: string | null;
};

export async function resolveProductPresentation(
  product: ProductPresentationSource,
): Promise<ResolvedProductPresentation> {
  const [categoryPres, pageSettings] = await Promise.all([
    prisma.productCategoryPresentation.findUnique({ where: { category: product.category } }),
    getProductPageSettings(),
  ]);

  const productHighlights = parseStringArray(product.highlightsJson);
  const categoryHighlights = parseStringArray(categoryPres?.highlightsJson);
  const fallbackHighlights = DEFAULT_CATEGORY_HIGHLIGHTS[product.category] || [];

  const productTrust = parseTrustBadges(product.trustBadgesJson);
  const categoryTrust = parseTrustBadges(categoryPres?.trustBadgesJson);
  const siteTrust = parseTrustBadges(pageSettings.trustBadgesJson);
  const trustBadges =
    productTrust.length > 0
      ? productTrust
      : categoryTrust.length > 0
        ? categoryTrust
        : siteTrust.length > 0
          ? siteTrust
          : DEFAULT_TRUST_BADGES;

  const badgeRaw = firstNonEmpty(
    product.badgeText,
    categoryPres?.badgeText,
    pageSettings.defaultBadgeText,
  );

  return {
    badge: badgeRaw || null,
    subtitle: (product.subtitle || "").trim() || null,
    shortDescription: (product.shortDescription || "").trim() || null,
    highlights:
      productHighlights.length > 0
        ? productHighlights
        : categoryHighlights.length > 0
          ? categoryHighlights
          : fallbackHighlights,
    trustBadges,
    showShortOnCatalog: pageSettings.showShortOnCatalog,
  };
}
