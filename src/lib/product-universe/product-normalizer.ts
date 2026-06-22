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
  const currency = currencyMatch
    ? currencyMatch[1].toUpperCase() === "TL"
      ? "TRY"
      : currencyMatch[1].toUpperCase()
    : "TRY";
  const numStr = str.replace(/[^\d.,]/g, "").replace(",", ".");
  const price = parseFloat(numStr);
  return { price: Number.isFinite(price) ? price : null, currency };
}

export function parseStock(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = parseInt(String(value).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function buildDuplicateKey(opts: {
  barcode?: string;
  stockCode?: string;
  normalizedName?: string;
  brand?: string;
  categoryPath?: string;
  imageUrl?: string;
}): string {
  const stockCode = (opts.stockCode || "").trim();
  if (stockCode) return `sku:${stockCode.toLowerCase()}`;

  const barcode = (opts.barcode || "").trim();
  if (barcode) return `barcode:${barcode}`;

  const name = (opts.normalizedName || "").toLowerCase();
  const brand = (opts.brand || "").toLowerCase();
  if (name && brand) return `namebrand:${name}|${brand}`;

  const imageUrl = (opts.imageUrl || "").toLowerCase();
  if (name && imageUrl) return `nameimg:${name}|${imageUrl}`;

  const category = (opts.categoryPath || "").toLowerCase();
  return `combo:${name}|${brand}|${category}`;
}

export function buildDuplicateKeys(row: {
  barcode?: string;
  stockCode?: string;
  normalizedName?: string;
  brand?: string;
  categoryPath?: string;
  imageUrls?: string[];
}): string[] {
  const keys = new Set<string>();
  keys.add(
    buildDuplicateKey({
      barcode: row.barcode,
      stockCode: row.stockCode,
      normalizedName: row.normalizedName,
      brand: row.brand,
      categoryPath: row.categoryPath,
      imageUrl: row.imageUrls?.[0],
    })
  );
  if (row.barcode) keys.add(`barcode:${row.barcode.trim()}`);
  if (row.stockCode) keys.add(`sku:${row.stockCode.trim().toLowerCase()}`);
  if (row.normalizedName && row.brand) {
    keys.add(`namebrand:${row.normalizedName.toLowerCase()}|${row.brand.toLowerCase()}`);
  }
  if (row.normalizedName && row.imageUrls?.[0]) {
    keys.add(`nameimg:${row.normalizedName.toLowerCase()}|${row.imageUrls[0].toLowerCase()}`);
  }
  return [...keys];
}
