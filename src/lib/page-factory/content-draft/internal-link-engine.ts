import type { ContentDraftInternalLink } from "./draft-types";
import type { DraftContext } from "./draft-types";
import { slugFromContext, productName } from "./draft-utils";

export function generateInternalLinks(ctx: DraftContext): ContentDraftInternalLink[] {
  const links: ContentDraftInternalLink[] = [];
  const hints = (ctx.metadata.internalLinkHints as Array<Record<string, unknown>>) || [];
  const name = productName(ctx);
  const slug = slugFromContext(ctx);

  for (const h of hints.slice(0, 10)) {
    const anchor = String(h.anchor || "");
    const targetType = String(h.targetType || "related");
    if (!anchor) continue;
    links.push({
      anchor,
      targetType: mapLinkType(targetType),
      targetId: null,
      targetSlug: slugifyHint(anchor),
      reason: `Blueprint metadata internalLinkHints: ${targetType}`,
      priority: Number(h.priority) || 5,
    });
  }

  const cat = (ctx.metadata.categoryPath as string)?.split(/[>/|]/).pop()?.trim();
  if (cat) {
    links.push({
      anchor: cat,
      targetType: "categoryParent",
      targetId: null,
      targetSlug: `/kategori/${slugifyHint(cat)}`,
      reason: "Ürün kategori yolu",
      priority: 8,
    });
  }

  if (ctx.product?.brand) {
    links.push({
      anchor: `${ctx.product.brand} Ürünleri`,
      targetType: "sameBrand",
      targetId: null,
      targetSlug: `/marka/${slugifyHint(ctx.product.brand)}`,
      reason: "Aynı marka ürünleri",
      priority: 7,
    });
  }

  if (ctx.blueprintKind === "PRODUCT_GEO" && ctx.metadata.geoPath) {
    links.push({
      anchor: `${ctx.metadata.geoPath} ${name}`,
      targetType: "geoSibling",
      targetId: null,
      targetSlug: `/geo/${slugifyHint(String(ctx.metadata.geoPath))}/${slug}`,
      reason: "GEO kardeş sayfa önerisi",
      priority: 6,
    });
  }

  if (ctx.blueprintKind !== "PRODUCT_DETAIL") {
    links.push({
      anchor: name,
      targetType: "productDetail",
      targetId: (ctx.metadata.productId as string) || null,
      targetSlug: `/urun/${slug}`,
      reason: "Ana ürün detay sayfası",
      priority: 9,
    });
  }

  if (ctx.blueprintKind === "PRODUCT_FAQ") {
    links.push({
      anchor: `${name} SSS`,
      targetType: "faqSibling",
      targetId: null,
      targetSlug: `/sss/${slug}`,
      reason: "FAQ kardeş sayfa",
      priority: 5,
    });
  }

  const seen = new Set<string>();
  return links
    .filter((l) => {
      const key = `${l.targetType}:${l.anchor}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 15);
}

function slugifyHint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapLinkType(raw: string): string {
  if (raw.includes("category")) return "sameCategory";
  if (raw.includes("entity")) return "sameIntent";
  if (raw.includes("geo")) return "geoSibling";
  if (raw.includes("related")) return "sameIntent";
  return raw;
}
