import type { FeedTemplate } from "./templates";
import { parseXmlToProducts } from "./xml-parser";
import { BEZOS_BAYI_XML } from "./connectors/bezos-bayi-xml";

export type ParsedFeedProduct = ReturnType<typeof parseXmlToProducts>[number];

const FETCH_HEADERS = {
  "User-Agent": "THYRONIX Feed Engine/1.0",
  Accept: "text/xml,application/xml,*/*",
};

export function parseFixedValues(raw?: string | null): Record<string, string> {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object") {
      return Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, v == null ? "" : String(v)]),
      );
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** Kaynak tanımından tüm feed URL'lerini çöz (manuel liste veya OFFSET otomasyonu) */
export function resolveSourceFeedUrls(xmlUrl: string, fixedValuesRaw?: string | null): string[] {
  let fixed: Record<string, unknown> = {};
  try {
    fixed = JSON.parse(fixedValuesRaw || "{}") as Record<string, unknown>;
  } catch {
    fixed = {};
  }

  const extra = fixed._feedUrls;
  if (Array.isArray(extra) && extra.length > 0) {
    return [...new Set(extra.map(String).filter(Boolean))];
  }

  if (fixed._autoOffset === true || fixed._autoOffset === "true") {
    const pageSize = Math.max(
      1000,
      parseInt(String(fixed._offsetPageSize || BEZOS_BAYI_XML.pagination.pageSize), 10) || 50000,
    );
    const maxPages = Math.min(20, parseInt(String(fixed._maxOffsetPages || "10"), 10) || 10);
    const urls = [xmlUrl];
    const base = new URL(xmlUrl);
    for (let page = 1; page < maxPages; page++) {
      const offset = page * pageSize;
      const u = new URL(base.toString());
      u.searchParams.set("OFFSET", String(offset));
      urls.push(u.toString());
    }
    return urls;
  }

  return xmlUrl ? [xmlUrl] : [];
}

export async function fetchXmlText(url: string, timeoutMs = 90000): Promise<string> {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const text = await res.text();
  if (!text || text.length < 10) throw new Error(`Boş yanıt — ${url}`);
  if (text.trim().startsWith("<!DOCTYPE") || text.includes("SAYFA BULUNAMADI")) {
    throw new Error(`XML değil HTML döndü (404 veya erişim engeli) — ${url}`);
  }
  return text;
}

export async function fetchAndParseXmlFeeds(
  urls: string[],
  template: FeedTemplate,
  customFieldMap?: Record<string, string>,
): Promise<{ products: ParsedFeedProduct[]; feedStats: { url: string; count: number; error?: string }[] }> {
  const allProducts: ParsedFeedProduct[] = [];
  const feedStats: { url: string; count: number; error?: string }[] = [];
  const seen = new Set<string>();

  for (const url of urls) {
    try {
      const xmlText = await fetchXmlText(url);
      const batch = parseXmlToProducts(xmlText, template, customFieldMap);
      let added = 0;
      for (const p of batch) {
        const key = String(p.barcode || p.stockCode || (p as { externalId?: string }).externalId || p.name || "");
        if (!key || seen.has(key)) continue;
        seen.add(key);
        allProducts.push(p);
        added++;
      }
      feedStats.push({ url, count: batch.length });
      // Otomatik OFFSET: boş sayfa gelirse dur
      if (batch.length === 0) break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      feedStats.push({ url, count: 0, error: msg });
      // İlk URL başarısızsa hata fırlat; sonraki sayfalar opsiyonel
      if (feedStats.length === 1) throw e;
      break;
    }
  }

  return { products: allProducts, feedStats };
}

export function normalizeBezosStatus(raw?: string): string {
  if (!raw) return "active";
  const v = raw.trim().toLowerCase();
  if (["1", "true", "aktif", "active", "evet", "yes"].includes(v)) return "active";
  if (["0", "false", "pasif", "passive", "hayır", "no"].includes(v)) return "passive";
  return raw;
}

export function normalizeCurrency(raw?: string, fallback = "TRY"): string {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "TL") return "TRY";
  return v || fallback;
}

export function productToThyronixRow(
  p: ParsedFeedProduct,
  sourceId: string,
  fixedValues: Record<string, string>,
) {
  const extId = String(
    p.barcode || p.stockCode || (p as { externalId?: string }).externalId || p.name || Math.random().toString(36),
  );
  return {
    sourceId,
    externalId: extId,
    name: p.name || "",
    description: p.description || null,
    brand: fixedValues.brand || p.brand || null,
    category: fixedValues.category || p.category || null,
    barcode: p.barcode || null,
    stockCode: p.stockCode || null,
    modelCode: p.modelCode || null,
    price: p.price || 0,
    stock: p.stock || 0,
    currency: normalizeCurrency(fixedValues.currency || p.currency, "TRY"),
    images: p.images || p.image || null,
    variantData: (p as { variantData?: string }).variantData || null,
    status: normalizeBezosStatus(fixedValues.status || p.status),
  };
}
