import type { ProductEntity, ProductAttribute, ProductImage, ProductUniverse } from "@prisma/client";

export type ContentDNA = {
  primaryEntity: string;
  targetKeyword: string;
  intent: string;
  audience: string;
  pageAngle: string;
  faqSeeds: string[];
  internalLinkHints: string[];
  schemaHints: string[];
};

function pickEntity(entities: ProductEntity[], type: string): string | null {
  return entities.find((e) => e.type === type)?.value || null;
}

function pickAttr(attrs: ProductAttribute[], key: string): string | null {
  return attrs.find((a) => a.key === key)?.value || null;
}

export function generateContentDNA(input: {
  product: ProductUniverse;
  entities: ProductEntity[];
  attributes: ProductAttribute[];
  images: ProductImage[];
}): ContentDNA {
  const { product, entities, attributes } = input;
  const theme = pickEntity(entities, "THEME");
  const material = pickEntity(entities, "MATERIAL") || pickAttr(attributes, "material");
  const size = pickEntity(entities, "SIZE") || pickAttr(attributes, "size");
  const usage = pickEntity(entities, "USAGE_AREA");
  const style = pickEntity(entities, "STYLE");
  const category = pickEntity(entities, "CATEGORY") || "ürün";

  const parts = [theme, material, category !== "ürün" ? category : null].filter(Boolean);
  const primaryEntity = parts.length ? parts.join(" ") : product.normalizedName;

  const keywordParts = [theme, material, category, size].filter(Boolean);
  const targetKeyword = keywordParts.length
    ? keywordParts.join(" ").toLowerCase()
    : product.normalizedName.toLowerCase();

  const intent = product.price && product.price > 0 ? "commercial" : "informational";

  const audienceParts: string[] = [];
  if (usage) audienceParts.push(usage);
  audienceParts.push("ev/ofis dekorasyonu alıcıları");
  const audience = audienceParts.join(", ");

  const angleParts: string[] = [];
  if (size) angleParts.push(`${size} ölçüsünde`);
  if (theme) angleParts.push(`${theme} temalı`);
  if (style) angleParts.push(style);
  if (material) angleParts.push(material);
  angleParts.push("dekoratif tablo");
  const pageAngle = angleParts.join(" ") || product.normalizedName;

  const faqSeeds: string[] = [];
  if (material?.includes("cam")) {
    faqSeeds.push(`${primaryEntity} nasıl temizlenir?`);
    faqSeeds.push("Cam tablo kırılır mı?");
  }
  if (size) {
    faqSeeds.push(`${size} tablo hangi alanlar için uygundur?`);
  }
  if (theme) {
    faqSeeds.push(`${theme} tablo modelleri nelerdir?`);
  }
  faqSeeds.push(`${product.normalizedName} fiyatı ne kadar?`);
  faqSeeds.push("Kargo ve iade koşulları nelerdir?");

  const internalLinkHints: string[] = [];
  if (material) internalLinkHints.push(`${material.charAt(0).toUpperCase() + material.slice(1)} Tablo Modelleri`);
  if (theme) internalLinkHints.push(`${theme} Tabloları`);
  if (usage) internalLinkHints.push(`${usage.charAt(0).toUpperCase() + usage.slice(1)} Tablo`);
  if (material?.includes("cam")) {
    internalLinkHints.push("Ofis Cam Tablo", "Salon Cam Tablo");
  }
  if (size) internalLinkHints.push(`${size} Tablo`);
  if (product.brand) internalLinkHints.push(`${product.brand} Ürünleri`);
  if (product.categoryPath) {
    const cat = product.categoryPath.split(/[>/|]/).pop()?.trim();
    if (cat) internalLinkHints.push(cat);
  }

  const schemaHints = ["Product", "FAQPage", "BreadcrumbList"];
  if (product.price) schemaHints.push("Offer");

  return {
    primaryEntity,
    targetKeyword,
    intent,
    audience,
    pageAngle,
    faqSeeds: [...new Set(faqSeeds)].slice(0, 6),
    internalLinkHints: [...new Set(internalLinkHints)].slice(0, 8),
    schemaHints: [...new Set(schemaHints)],
  };
}
