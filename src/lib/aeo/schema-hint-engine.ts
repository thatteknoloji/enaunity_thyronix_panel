import type { AeoSchemaHint } from "./aeo-types";
import type { BlueprintKind } from "./aeo-types";
import type { AeoProductContext } from "./aeo-utils";

const SCHEMA_MAP: Record<BlueprintKind, string[]> = {
  PRODUCT_DETAIL: ["Product", "FAQPage", "BreadcrumbList"],
  PRODUCT_FAQ: ["FAQPage", "Product"],
  PRODUCT_GEO: ["Product", "FAQPage"],
  PRODUCT_INTENT: ["Article", "FAQPage", "Product"],
  PRODUCT_CATEGORY: ["CollectionPage", "ItemList", "FAQPage"],
};

const REQUIRED_FIELDS: Record<string, string[]> = {
  Product: ["name", "image", "description", "brand", "offers"],
  FAQPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
  Article: ["headline", "author", "datePublished"],
  CollectionPage: ["name", "description"],
  ItemList: ["itemListElement"],
  LocalBusiness: ["name", "address"],
  Place: ["name", "geo"],
};

function parseStock(product: AeoProductContext["product"]): number | null {
  try {
    const meta = JSON.parse(product.metadataJson || "{}") as { stock?: number; rawStock?: number };
    if (typeof meta.stock === "number") return meta.stock;
    if (typeof meta.rawStock === "number") return meta.rawStock;
  } catch {
    /* skip */
  }
  return null;
}

function availability(stock: number | null): string | null {
  if (stock == null) return null;
  return stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
}

function buildProductJsonLd(ctx: AeoProductContext, metadata: Record<string, unknown>): Record<string, unknown> | null {
  const name = ctx.product.normalizedName;
  if (!name) return null;

  const draft: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
  };

  const imageUrl = ctx.images[0]?.publicUrl || ctx.images[0]?.sourceUrl;
  if (imageUrl) draft.image = imageUrl;
  if (ctx.product.descriptionClean?.trim()) draft.description = ctx.product.descriptionClean.trim();
  if (ctx.product.brand) draft.brand = { "@type": "Brand", name: ctx.product.brand };

  const offers: Record<string, unknown> = { "@type": "Offer" };
  if (ctx.product.price != null && ctx.product.price > 0) {
    offers.price = ctx.product.price;
    offers.priceCurrency = "TRY";
  }
  const stock = parseStock(ctx.product);
  const avail = availability(stock);
  if (avail) offers.availability = avail;
  if (Object.keys(offers).length > 1) draft.offers = offers;

  if (metadata.canonicalHint) draft.url = metadata.canonicalHint;

  return draft;
}

export function generateSchemaHints(
  blueprintKind: BlueprintKind,
  ctx: AeoProductContext,
  metadata: Record<string, unknown>,
  hasLocation: boolean
): AeoSchemaHint[] {
  const types = [...SCHEMA_MAP[blueprintKind]];
  if (blueprintKind === "PRODUCT_GEO" && hasLocation) {
    types.push("Place");
  }

  const available: Record<string, boolean> = {
    name: !!ctx.product.normalizedName,
    image: ctx.images.length > 0,
    description: !!ctx.product.descriptionClean?.trim(),
    brand: !!ctx.product.brand,
    offers: ctx.product.price != null,
    "offers.price": ctx.product.price != null && ctx.product.price > 0,
    "offers.priceCurrency": ctx.product.price != null && ctx.product.price > 0,
    availability: parseStock(ctx.product) != null,
    mainEntity: true,
    itemListElement: true,
    headline: !!ctx.product.normalizedName,
    author: true,
    datePublished: true,
    address: hasLocation,
    geo: hasLocation,
  };

  return types.map((type, i) => {
    const required = REQUIRED_FIELDS[type] || [];
    const availableFields = required.filter((f) => available[f] !== false);
    const missingFields = required.filter((f) => !availableFields.includes(f));

    let jsonLdDraft: Record<string, unknown> | null = null;
    if (type === "Product") {
      jsonLdDraft = buildProductJsonLd(ctx, metadata);
    }

    return {
      type,
      priority: i + 1,
      requiredFields: required,
      availableFields,
      missingFields,
      jsonLdDraft,
    };
  });
}
