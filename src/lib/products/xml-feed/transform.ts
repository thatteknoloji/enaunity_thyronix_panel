import type { ParsedImportRow } from "../marketplace-import/types";
import { DEFAULT_XML_FEED_RULES, type XmlFeedRules } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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
  return {
    fixedBrand: String(data.fixedBrand ?? base.fixedBrand).trim() || base.fixedBrand,
    priceSource: data.priceSource === "listPrice" || data.priceSource === "price" ? data.priceSource : "realPrice",
    priceMultiplier: Number(data.priceMultiplier) > 0 ? Number(data.priceMultiplier) : base.priceMultiplier,
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
  const raw = basePrice * rules.priceMultiplier;
  return roundPrice(raw, rules.roundPriceTo);
}

export function transformImportRows(rows: ParsedImportRow[], rules: XmlFeedRules): ParsedImportRow[] {
  const aliases = buildBrandAliases(rows, rules);
  return rows.map((row) => {
    const costBase = Number(row.raw?.costPrice ?? row.price) || row.price;
    const salePrice = applyPriceRule(costBase, rules);
    let name = row.name;
    let description = row.description;
    if (rules.stripBrandFromTitle) name = stripBrandTerms(name, aliases);
    if (rules.stripBrandFromDescription) description = stripBrandTerms(description, aliases);
    if (rules.titlePrefix) name = normalizeText(`${rules.titlePrefix} ${name}`);
    if (rules.titleSuffix) name = normalizeText(`${name} ${rules.titleSuffix}`);
    return {
      ...row,
      name: name || row.modelCode,
      description: description || name,
      brand: rules.fixedBrand,
      price: salePrice,
      raw: { ...row.raw, costPrice: costBase },
    };
  });
}

export function collectBrandAliases(rows: ParsedImportRow[], rules: XmlFeedRules): string[] {
  return buildBrandAliases(rows, rules);
}
