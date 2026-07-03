import { XMLParser } from "fast-xml-parser";
import type { FeedTemplate } from "./templates";
import { parseXmlToProducts } from "./xml-parser";
import { BEZOS_BAYI_XML } from "./connectors/bezos-bayi-xml";
import { parseThyronixNumber, roundToStep } from "./number";

const INDEX_PROBE_PARSER = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
});

/** xmltedarik.com gibi indeks XML'lerinden alt feed URL'lerini çıkarır */
export function discoverIndexedFeedUrls(xmlText: string): string[] {
  try {
    const parsed = INDEX_PROBE_PARSER.parse(xmlText) as Record<string, unknown>;
    const root = (parsed.XML ?? parsed.xml) as Record<string, unknown> | undefined;
    if (!root || typeof root !== "object") return [];
    return [
      ...new Set(
        Object.values(root).filter(
          (v): v is string => typeof v === "string" && /^https?:\/\//i.test(v),
        ),
      ),
    ];
  } catch {
    return [];
  }
}

export type ParsedFeedProduct = ReturnType<typeof parseXmlToProducts>[number];

const FETCH_HEADERS = {
  "User-Agent": "THYRONIX Feed Engine/1.0",
  Accept: "text/xml,application/xml,*/*",
};

function errorCauseMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const cause = "cause" in (error as Record<string, unknown>) ? (error as { cause?: unknown }).cause : undefined;
  if (!cause) return "";
  if (typeof cause === "string") return cause;
  if (typeof cause === "object") {
    const code = "code" in (cause as Record<string, unknown>) ? String((cause as { code?: unknown }).code || "") : "";
    const message = "message" in (cause as Record<string, unknown>) ? String((cause as { message?: unknown }).message || "") : "";
    return [code, message].filter(Boolean).join(" ");
  }
  return "";
}

function buildFetchErrorMessage(error: unknown, safeUrl: string): string {
  const base = error instanceof Error ? error.message : String(error);
  const cause = errorCauseMessage(error);
  const detail = cause && !base.includes(cause) ? `${base} — ${cause}` : base;
  return `${detail} — ${safeUrl}`;
}

async function fetchXmlTextOnce(url: string, timeoutMs: number): Promise<string> {
  const safeUrl = maskFeedUrl(url);
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 429 || res.status === 503) {
    throw new Error(`HTTP ${res.status} — ${safeUrl}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${safeUrl}`);
  const text = await res.text();
  if (!text || text.length < 10) throw new Error(`Boş yanıt — ${safeUrl}`);
  if (text.trim().startsWith("<!DOCTYPE") || text.includes("SAYFA BULUNAMADI")) {
    throw new Error(`XML değil HTML döndü (404 veya erişim engeli) — ${safeUrl}`);
  }
  return text;
}

function alternateHostUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.startsWith("www.")) {
      parsed.hostname = parsed.hostname.replace(/^www\./i, "");
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

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

/** Mask tokens/passwords in feed URLs for logs and error messages */
export function maskFeedUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const key of ["password", "token", "autologin", "api_key", "apikey", "key", "secret"]) {
      if (u.searchParams.has(key)) u.searchParams.set(key, "***");
    }
    return u
      .toString()
      .replace(/\/export\/[^/]+/i, "/export/***")
      .replace(/TicimaxXml\/[^/]+/i, "TicimaxXml/***");
  } catch {
    return url
      .replace(/password=[^&]+/gi, "password=***")
      .replace(/autologin=[^&]+/gi, "autologin=***");
  }
}

function normalizeIdentityText(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeNameFingerprint(value: unknown): string {
  return normalizeIdentityText(value).replace(/[^a-z0-9]+/g, "");
}

export function buildParsedProductIdentity(product: Partial<ParsedFeedProduct>): string {
  const barcode = normalizeIdentityText(product.barcode);
  const stockCode = normalizeIdentityText(product.stockCode);
  const modelCode = normalizeIdentityText(product.modelCode);
  const externalId = normalizeIdentityText((product as { externalId?: string }).externalId);
  const name = normalizeNameFingerprint(product.name);
  const variantSeed = Array.isArray((product as { variants?: unknown[] }).variants)
    ? `variants:${(product as { variants?: unknown[] }).variants!.length}`
    : "";

  if (barcode) return `barcode:${barcode}`;
  if (stockCode && modelCode) return `stock-model:${stockCode}|${modelCode}`;
  if (stockCode) return `stock:${stockCode}`;
  if (modelCode) return `model:${modelCode}`;
  if (externalId && name) return `external-name:${externalId}|${name}`;
  if (externalId) return `external:${externalId}`;
  if (name && variantSeed) return `name-variants:${name}|${variantSeed}`;
  if (name) return `name:${name}`;
  return `fallback:${Math.random().toString(36).slice(2)}`;
}

export function ensureUniqueRowExternalId<T extends { externalId: string }>(
  row: T,
  identity: string,
  usedExternalIds: Set<string>,
): T {
  const base = String(row.externalId || "").trim() || identity;
  if (!usedExternalIds.has(base)) {
    row.externalId = base;
    usedExternalIds.add(base);
    return row;
  }

  let attempt = `${base}::${identity}`;
  let index = 2;
  while (usedExternalIds.has(attempt)) {
    attempt = `${base}::${index++}`;
  }
  row.externalId = attempt;
  usedExternalIds.add(attempt);
  return row;
}

export async function fetchXmlText(url: string, timeoutMs = 180000): Promise<string> {
  const safeUrl = maskFeedUrl(url);
  let lastError: Error | null = null;
  const alternateUrl = alternateHostUrl(url);

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
    try {
      return await fetchXmlTextOnce(url, timeoutMs);
    } catch (e) {
      lastError = new Error(buildFetchErrorMessage(e, safeUrl));
      if (alternateUrl && /fetch failed|ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(lastError.message)) {
        try {
          return await fetchXmlTextOnce(alternateUrl, timeoutMs);
        } catch (alternateError) {
          lastError = new Error(
            `${buildFetchErrorMessage(e, safeUrl)} | fallback: ${buildFetchErrorMessage(
              alternateError,
              maskFeedUrl(alternateUrl),
            )}`,
          );
        }
      }
      if (!/HTTP 429|HTTP 503/.test(lastError.message)) throw lastError;
    }
  }

  throw lastError ?? new Error(`Fetch başarısız — ${safeUrl}`);
}

export async function fetchAndParseXmlFeeds(
  urls: string[],
  template: FeedTemplate,
  customFieldMap?: Record<string, string>,
  variantFieldMap?: Record<string, string>,
): Promise<{ products: ParsedFeedProduct[]; feedStats: { url: string; count: number; error?: string }[] }> {
  const allProducts: ParsedFeedProduct[] = [];
  const feedStats: { url: string; count: number; error?: string }[] = [];
  const seen = new Set<string>();

  for (const url of urls) {
    try {
      const xmlText = await fetchXmlText(url, 180000);
      const indexedUrls = discoverIndexedFeedUrls(xmlText);
      const xmlChunks: string[] = [];
      if (indexedUrls.length > 0) {
        for (const subUrl of indexedUrls) {
          xmlChunks.push(await fetchXmlText(subUrl, 180000));
        }
      } else {
        xmlChunks.push(xmlText);
      }

      let batch: ParsedFeedProduct[] = [];
      for (const chunk of xmlChunks) {
        batch = batch.concat(parseXmlToProducts(chunk, template, customFieldMap, variantFieldMap));
      }
      let added = 0;
      for (const p of batch) {
        const key = buildParsedProductIdentity(p);
        if (seen.has(key)) continue;
        seen.add(key);
        allProducts.push(p);
        added++;
      }
      feedStats.push({ url: maskFeedUrl(url), count: batch.length });
      // Otomatik OFFSET: boş sayfa gelirse dur
      if (batch.length === 0) break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      feedStats.push({ url: maskFeedUrl(url), count: 0, error: msg });
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
  const explicitExternalId = String((p as { externalId?: string }).externalId || "").trim();
  const extId = explicitExternalId || buildParsedProductIdentity(p);
  const priceMultiplier = parseThyronixNumber(fixedValues.priceMultiplier) ?? 1;
  const priceAdd = parseThyronixNumber(fixedValues.priceAdd) ?? 0;
  const priceMin = parseThyronixNumber(fixedValues.priceMin);
  const priceRoundTo = parseThyronixNumber(fixedValues.priceRoundTo);
  const vatRateOverride = parseThyronixNumber(fixedValues.vatRateOverride ?? fixedValues.vatRate);
  const stockFloor = parseThyronixNumber(fixedValues.stockFloor ?? fixedValues.safetyStock);
  let finalPrice = (p.price || 0) * priceMultiplier + priceAdd;
  if (typeof priceMin === "number") finalPrice = Math.max(finalPrice, priceMin);
  finalPrice = roundToStep(finalPrice, priceRoundTo);
  const finalStock = typeof stockFloor === "number"
    ? Math.max(p.stock || 0, Math.floor(stockFloor))
    : p.stock || 0;

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
    price: Number.isFinite(finalPrice) ? finalPrice : p.price || 0,
    discountedPrice: (p as { discountedPrice?: number; salePrice?: number }).discountedPrice
      ?? (p as { salePrice?: number }).salePrice
      ?? null,
    costPrice: p.costPrice ?? null,
    stock: finalStock,
    currency: normalizeCurrency(fixedValues.currency || p.currency, "TRY"),
    image: p.image || null,
    images: p.images || p.image || null,
    weight: p.weight ?? null,
    dimensions: p.dimensions || null,
    vatRate: vatRateOverride ?? p.vatRate ?? null,
    deliveryTime: p.deliveryTime || null,
    manufacturer: p.manufacturer || null,
    warranty: p.warranty || null,
    shippingCost: p.shippingCost ?? null,
    productUrl: p.productUrl || null,
    variantData: (p as { variantData?: string }).variantData || null,
    metadataJson: (p as { metadataJson?: string }).metadataJson || "{}",
    status: normalizeBezosStatus(fixedValues.status || p.status),
  };
}
