import { slugify } from "@/lib/utils";

export function normalizeProductName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/[|/\\]+/g, " ")
    .replace(/\s*[-–—]\s*/g, " - ")
    .trim();
}

export function generateProductSlug(name: string, suffix?: string): string {
  const base = slugify(normalizeProductName(name)) || "urun";
  if (!suffix) return base;
  return `${base}-${suffix}`;
}

export function parsePrice(value: unknown): { price: number | null; currency: string } {
  if (value == null || value === "") return { price: null, currency: "TRY" };
  const str = String(value).trim();
  const currencyMatch = str.match(/\b(TRY|TL|USD|EUR|GBP)\b/i);
  const currency = currencyMatch ? (currencyMatch[1].toUpperCase() === "TL" ? "TRY" : currencyMatch[1].toUpperCase()) : "TRY";
  const numStr = str.replace(/[^\d.,]/g, "").replace(",", ".");
  const price = parseFloat(numStr);
  return { price: Number.isFinite(price) ? price : null, currency };
}

export function buildDuplicateKey(opts: {
  barcode?: string;
  normalizedName?: string;
  brand?: string;
  categoryPath?: string;
}): string {
  const barcode = (opts.barcode || "").trim();
  if (barcode) return `barcode:${barcode}`;
  const name = (opts.normalizedName || "").toLowerCase();
  const brand = (opts.brand || "").toLowerCase();
  const category = (opts.categoryPath || "").toLowerCase();
  return `combo:${name}|${brand}|${category}`;
}
