import type { DraftContext } from "./draft-types";
import { parseStock, productName } from "./draft-utils";

function availability(stock: number | null): string | undefined {
  if (stock == null) return undefined;
  return stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
}

export function generateSchemaDraft(ctx: DraftContext, faq: Array<{ question: string; answer: string }>): Record<string, unknown> {
  const schemas: Record<string, unknown>[] = [];
  const name = productName(ctx);
  const hints = ctx.aeo?.schemaHints || [];

  const productHint = hints.find((h) => h.type === "Product");
  if (productHint || ctx.product || ctx.metadata.productId) {
    const product: Record<string, unknown> = {
      "@type": "Product",
      name,
    };
    const img = ctx.images[0]?.publicUrl || ctx.images[0]?.sourceUrl;
    if (img) product.image = img;
    if (ctx.product?.descriptionClean?.trim()) product.description = ctx.product.descriptionClean.trim();
    if (ctx.product?.brand) product.brand = { "@type": "Brand", name: ctx.product.brand };
    if (ctx.product?.stockCode) product.sku = ctx.product.stockCode;

    const offers: Record<string, unknown> = { "@type": "Offer" };
    if (ctx.product?.price != null && ctx.product.price > 0) {
      offers.price = ctx.product.price;
      offers.priceCurrency = ctx.product.currency || "TRY";
    }
    const stock = ctx.product ? parseStock(ctx.product.metadataJson) : null;
    const avail = availability(stock);
    if (avail) offers.availability = avail;
    if (Object.keys(offers).length > 1) product.offers = offers;

    if (productHint?.jsonLdDraft) {
      schemas.push({ ...(productHint.jsonLdDraft as object) });
    } else {
      schemas.push({ "@context": "https://schema.org", ...product });
    }
  }

  if (faq.length >= 2) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  const canonical = (ctx.metadata.canonicalHint as string) || `/urun/${ctx.metadata.slug || ""}`;
  if (canonical) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "/" },
        { "@type": "ListItem", position: 2, name: name, item: canonical },
      ],
    });
  }

  if (ctx.blueprintKind === "PRODUCT_CATEGORY") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: productName(ctx),
      description: ctx.product?.descriptionClean?.slice(0, 160) || undefined,
    });
  }

  if (ctx.blueprintKind === "PRODUCT_INTENT") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: name,
      description: ctx.product?.descriptionClean?.slice(0, 160) || undefined,
    });
  }

  const missingFields = hints.flatMap((h) => h.missingFields);

  return {
    "@context": "https://schema.org",
    "@graph": schemas,
    missingFields: [...new Set(missingFields)],
  };
}
