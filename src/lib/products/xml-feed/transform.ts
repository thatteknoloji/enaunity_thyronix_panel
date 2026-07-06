import type { ParsedImportRow } from "../marketplace-import/types";
import { applyXmlPriceRule, normalizePriceTiers } from "./price-rules";
import { DEFAULT_XML_FEED_RULES, type XmlFeedRules } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function stripHtml(input: string): string {
  if (!input) return "";
  let text = input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "");

  text = text.replace(/&#(\d+);/g, (_, code) => {
    const n = Number(code);
    return Number.isFinite(n) ? String.fromCharCode(n) : "";
  });
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const n = parseInt(hex, 16);
    return Number.isFinite(n) ? String.fromCharCode(n) : "";
  });

  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Başlık: tek satır, HTML'siz, fazla boşluk yok */
export function sanitizeTitle(input: string): string {
  return normalizeText(stripHtml(input).replace(/\n+/g, " "));
}

/** Açıklama: HTML'siz, paragraf satırları korunur */
export function sanitizeDescription(input: string): string {
  return stripHtml(input);
}

function roundPrice(value: number, step: number): number {
  if (!step || step <= 0) return Math.round(value * 100) / 100;
  return Math.round(value / step) * step;
}

function buildBrandAliases(rows: ParsedImportRow[], rules: XmlFeedRules): string[] {
  const aliases = new Set<string>(rules.extraBrandAliases.map((a) => a.trim()).filter(Boolean));
  if (rules.brandAliasesFromFeed) {
    for (const row of rows) {
      if (row.brand) aliases.add(row.brand.trim());
    }
  }
  if (rules.fixedBrand) aliases.add(rules.fixedBrand.trim());
  return [...aliases].filter(Boolean).sort((a, b) => b.length - a.length);
}

function stripBrandTerms(input: string, aliases: string[]): string {
  let output = input;
  for (const term of aliases) {
    if (!term) continue;
    output = output.replace(new RegExp(escapeRegExp(term), "gi"), " ");
  }
  return normalizeText(output);
}

export function parseFeedRules(raw: unknown): XmlFeedRules {
  const base = { ...DEFAULT_XML_FEED_RULES };
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<XmlFeedRules>;
  const priceMode = data.priceMode === "tiered" ? "tiered" : "flat";
  return {
    fixedBrand:
      data.fixedBrand !== undefined ? String(data.fixedBrand).trim() : base.fixedBrand,
    priceSource: data.priceSource === "listPrice" || data.priceSource === "price" ? data.priceSource : "realPrice",
    priceMode,
    priceMultiplier: Number(data.priceMultiplier) > 0 ? Number(data.priceMultiplier) : base.priceMultiplier,
    priceTiers: normalizePriceTiers(data.priceTiers),
    fixedPriceAdjustment: Number.isFinite(Number(data.fixedPriceAdjustment))
      ? Number(data.fixedPriceAdjustment)
      : base.fixedPriceAdjustment,
    applyMarginPerVariant: data.applyMarginPerVariant ?? base.applyMarginPerVariant,
    stripBrandFromTitle: data.stripBrandFromTitle ?? base.stripBrandFromTitle,
    stripBrandFromDescription: data.stripBrandFromDescription ?? base.stripBrandFromDescription,
    brandAliasesFromFeed: data.brandAliasesFromFeed ?? base.brandAliasesFromFeed,
    extraBrandAliases: Array.isArray(data.extraBrandAliases) ? data.extraBrandAliases.map(String) : base.extraBrandAliases,
    titlePrefix: String(data.titlePrefix ?? base.titlePrefix).trim(),
    titleSuffix: String(data.titleSuffix ?? base.titleSuffix).trim(),
    syncIntervalHours: Number(data.syncIntervalHours) > 0 ? Number(data.syncIntervalHours) : base.syncIntervalHours,
    autoCreateCategories: data.autoCreateCategories ?? base.autoCreateCategories,
    deactivateMissing: data.deactivateMissing ?? base.deactivateMissing,
    updateStockOnSync: data.updateStockOnSync ?? base.updateStockOnSync,
    updateImagesOnSync: data.updateImagesOnSync ?? base.updateImagesOnSync,
    roundPriceTo: Number(data.roundPriceTo) >= 0 ? Number(data.roundPriceTo) : base.roundPriceTo,
  };
}

export function applyPriceRule(basePrice: number, rules: XmlFeedRules): number {
  return applyXmlPriceRule(basePrice, rules);
}

export function transformImportRows(rows: ParsedImportRow[], rules: XmlFeedRules): ParsedImportRow[] {
  const aliases = buildBrandAliases(rows, rules);
  return rows.map((row) => {
    const costBase = Number(row.raw?.costPrice ?? row.price) || row.price;
    const salePrice = applyPriceRule(costBase, rules);
    let name = sanitizeTitle(row.name);
    let description = sanitizeDescription(row.description || "");
    if (rules.stripBrandFromTitle) name = stripBrandTerms(name, aliases);
    if (rules.stripBrandFromDescription) description = stripBrandTerms(description, aliases);
    if (rules.titlePrefix) name = normalizeText(`${rules.titlePrefix} ${name}`);
    if (rules.titleSuffix) name = normalizeText(`${name} ${rules.titleSuffix}`);
    const seoTitle = row.seoTitle ? sanitizeTitle(row.seoTitle) : undefined;
    const seoDescription = row.seoDescription ? sanitizeDescription(row.seoDescription) : undefined;
    return {
      ...row,
      name: name || row.modelCode,
      description: description || name,
      seoTitle,
      seoDescription,
      brand: rules.fixedBrand?.trim() ? rules.fixedBrand : row.brand,
      price: salePrice,
      raw: { ...row.raw, costPrice: costBase },
    };
  });
}

export function collectBrandAliases(rows: ParsedImportRow[], rules: XmlFeedRules): string[] {
  return buildBrandAliases(rows, rules);
}
