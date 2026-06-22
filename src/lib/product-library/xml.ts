import { XMLParser } from "fast-xml-parser";
import type { CatalogItemInput } from "./types";

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function num(val: unknown, fallback = 0): number {
  const n = parseFloat(String(val ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}

export function parseXmlProducts(xml: string): CatalogItemInput[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
  });
  const parsed = parser.parse(xml);
  const root = parsed?.products || parsed?.Products || parsed?.urunler || parsed?.Urunler || parsed;
  const nodes = [
    ...toArray(root?.product),
    ...toArray(root?.Product),
    ...toArray(root?.urun),
    ...toArray(root?.item),
    ...(Array.isArray(root) ? root : []),
  ];

  return nodes
    .map((node) => {
      const o = (node || {}) as Record<string, unknown>;
      const name = pick(o, ["name", "title", "urun_adi", "productName", "Name"]);
      if (!name) return null;
      return {
        barcode: pick(o, ["barcode", "barkod", "ean", "gtin"]),
        sku: pick(o, ["sku", "stockCode", "stok_kodu", "code"]),
        name,
        brand: pick(o, ["brand", "marka", "manufacturer"]),
        category: pick(o, ["category", "kategori", "cat"]),
        price: num(o.price ?? o.fiyat ?? o.listPrice),
        salePrice: num(o.salePrice ?? o.satis_fiyati ?? o.price ?? o.fiyat),
        stock: Math.round(num(o.stock ?? o.stok ?? o.quantity, 0)),
        vatRate: num(o.vatRate ?? o.kdv ?? o.tax, 20),
        imagesJson: JSON.stringify(
          [o.image, o.imageUrl, o.resim].filter(Boolean).map(String)
        ),
        attributesJson: JSON.stringify(o),
      } satisfies CatalogItemInput;
    })
    .filter(Boolean) as CatalogItemInput[];
}

export function itemsToXml(items: Record<string, string | number>[]): string {
  const rows = items
    .map(
      (p) =>
        `  <product>
${Object.entries(p)
  .map(([key, value]) => `    <${sanitizeXmlTag(key)}>${escapeXml(String(value ?? ""))}</${sanitizeXmlTag(key)}>`)
  .join("\n")}
  </product>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<products>\n${rows}\n</products>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sanitizeXmlTag(tag: string) {
  return tag.replace(/[^a-zA-Z0-9_-]/g, "_") || "field";
}
