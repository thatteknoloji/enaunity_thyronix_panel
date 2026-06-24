import type { LegacyUrlImportRow } from "./types";
import { normalizeLegacyUrl } from "./url-normalizer";

function parseCsvLine(line: string): LegacyUrlImportRow | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const parts = trimmed.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
  const url = parts[0];
  if (!url || url.toLowerCase() === "url") return null;
  return {
    url,
    lastmod: parts[1] || null,
    source: parts[2] || "csv",
  };
}

export function parseCsvUrls(content: string): LegacyUrlImportRow[] {
  return content
    .split(/\r?\n/)
    .map(parseCsvLine)
    .filter((r): r is LegacyUrlImportRow => !!r);
}

export function parseTxtUrls(content: string, source = "txt"): LegacyUrlImportRow[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((url) => ({ url, source }));
}

function extractLocsFromXml(xml: string): string[] {
  const locs: string[] = [];
  const locRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    locs.push(match[1].trim());
  }
  return locs;
}

function extractLastmodsFromXml(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  const urlBlockRegex = /<url>([\s\S]*?)<\/url>/gi;
  let block;
  while ((block = urlBlockRegex.exec(xml)) !== null) {
    const loc = /<loc>\s*([^<]+)\s*<\/loc>/i.exec(block[1]);
    const lastmod = /<lastmod>\s*([^<]+)\s*<\/lastmod>/i.exec(block[1]);
    if (loc) map.set(loc[1].trim(), lastmod?.[1]?.trim() || "");
  }
  return map;
}

export function parseSitemapXml(content: string, source = "sitemap"): LegacyUrlImportRow[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  if (/<sitemapindex/i.test(trimmed)) {
    const childSitemaps = extractLocsFromXml(trimmed);
    return childSitemaps.map((url) => ({
      url,
      source: "sitemap-index",
    }));
  }

  const locs = extractLocsFromXml(trimmed);
  const lastmods = extractLastmodsFromXml(trimmed);
  return locs.map((url) => ({
    url,
    lastmod: lastmods.get(url) || null,
    source,
  }));
}

export function parseLegacyUrlImport(opts: {
  format: "csv" | "txt" | "sitemap" | "manual";
  content: string;
  urls?: string[];
  source?: string;
}): LegacyUrlImportRow[] {
  switch (opts.format) {
    case "csv":
      return parseCsvUrls(opts.content);
    case "txt":
      return parseTxtUrls(opts.content, opts.source || "txt");
    case "sitemap":
      return parseSitemapXml(opts.content, opts.source || "sitemap");
    case "manual":
      return (opts.urls || [])
        .map((u) => u.trim())
        .filter(Boolean)
        .map((url) => ({ url, source: opts.source || "manual" }));
    default:
      return [];
  }
}

export function dedupeImportRows(rows: LegacyUrlImportRow[]): LegacyUrlImportRow[] {
  const seen = new Set<string>();
  const result: LegacyUrlImportRow[] = [];
  for (const row of rows) {
    const key = normalizeLegacyUrl(row.url);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}
