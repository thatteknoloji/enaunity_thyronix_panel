import type { DraftContext } from "./draft-types";
import { categoryLabel, pickEntity, pickAttr } from "@/lib/aeo/aeo-utils";
import { parseMetadata } from "@/lib/aeo/aeo-utils";

export { parseMetadata };

export function productName(ctx: DraftContext): string {
  return (
    (ctx.metadata.productName as string) ||
    ctx.product?.normalizedName ||
    ctx.blueprint.title
  );
}

export function targetQuery(ctx: DraftContext): string {
  return (
    (ctx.metadata.targetKeyword as string) ||
    ctx.contentDNA?.targetKeyword ||
    ctx.aeo?.targetQuery ||
    productName(ctx).toLowerCase()
  );
}

export function slugFromContext(ctx: DraftContext): string {
  return (
    (ctx.metadata.slug as string) ||
    (ctx.metadata.productSlug as string) ||
    ctx.product?.slug ||
    ctx.blueprint.title.toLowerCase().replace(/\s+/g, "-")
  );
}

export function geoLabel(ctx: DraftContext): string | null {
  const geoPath = (ctx.metadata.geoPath as string) || ctx.aeo?.geoHints?.province || null;
  if (!geoPath?.trim()) return null;
  const parts = geoPath.split(/[>]/).map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] || geoPath;
}

export function featureBullets(ctx: DraftContext): string[] {
  const bullets: string[] = [];
  if (!ctx.product) {
    const cat = categoryLabel(ctx.metadata.categoryPath as string);
    if (cat) bullets.push(`Kategori: ${cat}`);
    if (ctx.metadata.brand) bullets.push(`Marka: ${String(ctx.metadata.brand)}`);
    return bullets;
  }
  const mat = pickEntity(ctx.entities, "MATERIAL") || pickAttr(ctx.attributes, "material");
  const size = pickEntity(ctx.entities, "SIZE") || pickAttr(ctx.attributes, "size");
  const usage = pickEntity(ctx.entities, "USAGE_AREA");
  const style = pickEntity(ctx.entities, "STYLE");
  const theme = pickEntity(ctx.entities, "THEME");
  if (mat) bullets.push(`Malzeme: ${mat}`);
  if (size) bullets.push(`Ölçü: ${size}`);
  if (usage) bullets.push(`Kullanım alanı: ${usage}`);
  if (style) bullets.push(`Stil: ${style}`);
  if (theme) bullets.push(`Tema: ${theme}`);
  if (ctx.product?.brand) bullets.push(`Marka: ${ctx.product.brand}`);
  const cat = categoryLabel(ctx.product?.categoryPath || (ctx.metadata.categoryPath as string));
  if (cat) bullets.push(`Kategori: ${cat}`);
  return bullets.slice(0, 8);
}

export function safeIntroSuffix(): string {
  return "Stok ve fiyat bilgisi dönemsel olarak değişebilir.";
}

export function policyWarnings(ctx: DraftContext): string[] {
  const warnings: string[] = [];
  const cat = (ctx.product?.categoryPath || (ctx.metadata.categoryPath as string) || "").toLowerCase();
  if (["sağlık", "tıbbi", "ilaç"].some((s) => cat.includes(s))) {
    warnings.push("Sağlık/tıbbi kategori — kesin tedavi veya fayda iddiası yapılmamalıdır.");
  }
  if (["finans", "kredi", "yatırım"].some((s) => cat.includes(s))) {
    warnings.push("Finans kategorisi — kesin getiri veya fayda iddiası yapılmamalıdır.");
  }
  if (ctx.metadata.noindexRecommended === true || ctx.aeo?.noindexRecommended) {
    warnings.push("noindex öneriliyor — yayın öncesi kalite kontrolü gerekir.");
  }
  const qs = Number(ctx.metadata.qualityScore ?? ctx.product?.qualityScore ?? 100);
  if (qs < 40) warnings.push("Ürün kalite skoru düşük — draft reddedilebilir.");
  return warnings;
}

export function parseStock(metadataJson: string): number | null {
  try {
    const m = JSON.parse(metadataJson || "{}") as { stock?: number };
    return typeof m.stock === "number" ? m.stock : null;
  } catch {
    return null;
  }
}
