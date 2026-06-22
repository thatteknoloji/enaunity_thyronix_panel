import type { ProductAttribute, ProductContentDNA, ProductEntity, ProductImage, ProductUniverse } from "@prisma/client";
import type { BlueprintKind } from "./aeo-types";

export const BANNED_PHRASES = [
  "en iyi",
  "garantili",
  "kesin",
  "mutlaka",
  "rakipsiz",
  "tek seçenek",
  "%100",
];

export type AeoProductContext = {
  product: ProductUniverse;
  entities: ProductEntity[];
  attributes: ProductAttribute[];
  images: ProductImage[];
  contentDNA: ProductContentDNA | null;
};

export function parseJsonArray(json: string): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function parseMetadata(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function pickEntity(entities: ProductEntity[], type: string): string | null {
  return entities.find((e) => e.type === type)?.value || null;
}

export function pickAttr(attrs: ProductAttribute[], key: string): string | null {
  return attrs.find((a) => a.key === key)?.value || null;
}

export function categoryLabel(categoryPath?: string | null): string | null {
  if (!categoryPath?.trim()) return null;
  return categoryPath.split(/[>/|]/).pop()?.trim() || null;
}

export function sanitizeText(text: string): string {
  let out = text.replace(/\s+/g, " ").trim();
  for (const phrase of BANNED_PHRASES) {
    const re = new RegExp(phrase, "gi");
    out = out.replace(re, "");
  }
  return out.replace(/\s+/g, " ").trim();
}

export function clampLength(text: string, min: number, max: number): string {
  let out = sanitizeText(text);
  if (out.length > max) {
    const cut = out.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    out = lastSpace > min ? cut.slice(0, lastSpace) + "." : cut + ".";
  }
  if (out.length < min && !out.endsWith(".")) out += ".";
  return out;
}

export function makeId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

export function resolveBlueprintKind(metadata: Record<string, unknown>, pageType: string): BlueprintKind {
  const kind = metadata.blueprintKind as string | undefined;
  if (kind && ["PRODUCT_DETAIL", "PRODUCT_CATEGORY", "PRODUCT_INTENT", "PRODUCT_GEO", "PRODUCT_FAQ"].includes(kind)) {
    return kind as BlueprintKind;
  }
  const map: Record<string, BlueprintKind> = {
    product_detail: "PRODUCT_DETAIL",
    product_category: "PRODUCT_CATEGORY",
    product_intent: "PRODUCT_INTENT",
    product_geo: "PRODUCT_GEO",
    product_faq: "PRODUCT_FAQ",
  };
  return map[pageType] || "PRODUCT_DETAIL";
}

export function entityValues(ctx: AeoProductContext): string[] {
  return ctx.entities.map((e) => e.value).filter(Boolean);
}

export function isSensitiveCategory(categoryPath?: string | null): boolean {
  if (!categoryPath) return false;
  const lower = categoryPath.toLowerCase();
  const sensitive = ["sağlık", "tıbbi", "ilaç", "hukuk", "avukat", "finans", "kredi", "sigorta", "yatırım"];
  return sensitive.some((s) => lower.includes(s));
}

export function usagePhrase(ctx: AeoProductContext): string {
  const usage = pickEntity(ctx.entities, "USAGE_AREA");
  if (usage) return `${usage} gibi alanlarda`;
  const cat = categoryLabel(ctx.product.categoryPath);
  if (cat) return `${cat.toLowerCase()} kategorisinde`;
  return "farklı kullanım alanlarında";
}

export function materialPhrase(ctx: AeoProductContext): string | null {
  return pickEntity(ctx.entities, "MATERIAL") || pickAttr(ctx.attributes, "material");
}

export function purposePhrase(ctx: AeoProductContext): string {
  const usage = pickEntity(ctx.entities, "USAGE_AREA");
  if (usage) return `${usage.toLowerCase()} düzenlemesi ve dekorasyonu`;
  const cat = categoryLabel(ctx.product.categoryPath);
  if (cat) return `${cat.toLowerCase()} ihtiyaçları`;
  return "dekorasyon ve düzenleme";
}
