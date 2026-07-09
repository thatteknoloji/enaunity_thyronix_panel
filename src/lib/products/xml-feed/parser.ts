import { inspectXmlFeed, parseXmlToProducts } from "@/lib/thyronix/xml-parser";
import type { ParsedImportRow } from "../marketplace-import/types";
import { inspectIkasXml, parseIkasXmlToRows } from "./ikas-parser";
import { buildCustomFieldMap, buildVariantFieldMap, getFeedTemplate } from "./templates";
import type { XmlFeedTestResult } from "./types";

function parseJsonArray(value?: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stringValue(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = stringValue(value).replace(/[₺$€£TL\s]/gi, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function collectImages(product: Record<string, unknown>, mapping: Record<string, string>): string[] {
  const keys = ["image1", "image2", "image3", "image4", "image5", "image"];
  const urls: string[] = [];
  for (const key of keys) {
    const xmlTag = mapping[key] || key;
    const val = stringValue(product[xmlTag] || product.image || product.images);
    if (val && (val.startsWith("http") || val.startsWith("/"))) urls.push(val);
  }
  const imagesField = stringValue(product.images || product.image);
  if (imagesField.includes(",")) {
    for (const part of imagesField.split(",")) {
      const p = part.trim();
      if (p.startsWith("http")) urls.push(p);
    }
  }
  return [...new Set(urls)];
}

type ParsedProductLike = {
  name?: string;
  description?: string;
  brand?: string;
  category?: string;
  barcode?: string;
  stockCode?: string;
  modelCode?: string;
  externalId?: string;
  price?: number;
  costPrice?: number;
  stock?: number;
  image?: string;
  images?: string;
  vatRate?: number;
  variantData?: string;
  variants?: Array<{
    barcode?: string;
    sku?: string;
    price?: number;
    stock?: number;
    image?: string;
    options?: Array<{ group: string; value: string }>;
  }>;
};

type ParsedVariant = NonNullable<ParsedProductLike["variants"]>[number];

function rowsFromProduct(product: ParsedProductLike, rowIndex: number, priceBase?: number): ParsedImportRow[] {
  const modelCode = stringValue(product.modelCode || product.stockCode || product.externalId);
  const variants = product.variants?.length
    ? product.variants
    : (parseJsonArray(product.variantData) as ParsedProductLike["variants"]);

  const images = collectImages(product as Record<string, unknown>, {});
  const baseImage = stringValue(product.image) || images[0] || "";

  const buildRow = (variant: ParsedVariant | undefined, idx: number): ParsedImportRow => {
    const variantPrice = variant?.price ?? priceBase ?? product.price ?? product.costPrice ?? 0;
    const barcode = stringValue(variant?.barcode || product.barcode);
    let sku = stringValue(variant?.sku || product.stockCode || "");
    // Leyna: all sizes share productCode — use barcode as unique SKU.
    if (!sku || sku === modelCode) {
      sku = barcode || `${modelCode}-${idx + 1}`;
    }
    const options = (variant?.options || []).filter((o) => o.group && o.value);
    const errors: string[] = [];
    if (!modelCode) errors.push("Model Kodu eksik");
    if (!barcode) errors.push("Barkod eksik");
    return {
      rowIndex: rowIndex + idx,
      name: stringValue(product.name) || modelCode,
      description: stringValue(product.description) || stringValue(product.name),
      brand: stringValue(product.brand),
      category: stringValue(product.category),
      modelCode,
      sku,
      barcode,
      price: numberValue(variantPrice),
      stock: Math.max(0, Math.floor(numberValue(variant?.stock ?? product.stock))),
      image: stringValue(variant?.image) || baseImage,
      images: baseImage && !images.includes(baseImage) ? [baseImage, ...images] : images,
      variantOptions: options,
      raw: {
        externalId: product.externalId,
        costPrice: product.costPrice ?? priceBase,
        vatRate: product.vatRate,
      },
      errors,
      warnings: variantPrice <= 0 ? ["Fiyat 0 veya geçersiz"] : [],
    };
  };

  if (!variants?.length) return [buildRow(undefined, 0)];
  return variants.map((variant, idx) => buildRow(variant, idx));
}

export function inspectFeedXml(xml: string, templateId: string): Omit<XmlFeedTestResult, "ok"> {
  if (templateId === "ikas") {
    const info = inspectIkasXml(xml);
    const normalizedSamples = (info.sampleValues || []).map((sample) => ({
      id: String(sample.id || ""),
      name: String(sample.name || ""),
      category: String(sample.category || ""),
      barcode: String(sample.barcode || ""),
      price: String(sample.price || ""),
    }));
    return {
      productCount: info.productCount,
      detectedFields: info.detectedFields,
      variantFields: info.variantFields,
      categoryValues: info.categoryValues,
      brandValues: info.brandValues,
      sampleValues: normalizedSamples,
    };
  }
  const template = getFeedTemplate(templateId);
  const inspection = inspectXmlFeed(xml, template);
  const products = parseXmlToProducts(xml, template);
  const categoryValues = [...new Set(products.map((p) => stringValue(p.category)).filter(Boolean))];
  const brandValues = [...new Set(products.map((p) => stringValue(p.brand)).filter(Boolean))];
  return {
    productCount: inspection.totalItems,
    detectedFields: inspection.detectedFields,
    variantFields: inspection.variantFields,
    categoryValues,
    brandValues,
    sampleValues: inspection.sampleValues,
  };
}

export function parseFeedXmlToRows(
  xml: string,
  templateId: string,
  mappingJson: Record<string, string> = {},
  variantMappingJson: Record<string, string> = {},
): { rows: ParsedImportRow[]; categoryValues: string[]; brandValues: string[]; parseErrors: string[] } {
  if (templateId === "ikas") {
    return parseIkasXmlToRows(xml);
  }
  const template = getFeedTemplate(templateId);
  const customMap = buildCustomFieldMap(mappingJson);
  const variantMap = buildVariantFieldMap(variantMappingJson);
  const products = parseXmlToProducts(xml, template, customMap, variantMap) as ParsedProductLike[];

  const rows: ParsedImportRow[] = [];
  const parseErrors: string[] = [];
  let rowIndex = 0;
  for (const product of products) {
    const priceBase = product.costPrice ?? product.price;
    const productRows = rowsFromProduct(product, rowIndex, priceBase);
    for (const row of productRows) {
      if (row.errors.length) parseErrors.push(...row.errors.map((e) => `${row.modelCode}: ${e}`));
    }
    rows.push(...productRows);
    rowIndex += productRows.length;
  }

  const categoryValues = [...new Set(rows.map((r) => r.category).filter(Boolean))];
  const brandValues = [...new Set(rows.map((r) => r.brand).filter(Boolean))];
  return { rows, categoryValues, brandValues, parseErrors };
}

export async function testFeedUrl(
  feedUrl: string,
  templateId: string,
  mappingJson: Record<string, string> = {},
  variantMappingJson: Record<string, string> = {},
): Promise<XmlFeedTestResult> {
  try {
    const { fetchXmlFeed } = await import("./fetcher");
    const xml = await fetchXmlFeed(feedUrl);
    const result = inspectFeedXml(xml, templateId);
    const parsed = parseFeedXmlToRows(xml, templateId, mappingJson, variantMappingJson);
    return {
      ok: true,
      ...result,
      productCount: parsed.rows.length > 0 ? result.productCount : 0,
    };
  } catch (e) {
    return {
      ok: false,
      productCount: 0,
      detectedFields: [],
      variantFields: [],
      categoryValues: [],
      brandValues: [],
      sampleValues: {},
      error: e instanceof Error ? e.message : "Test failed",
    };
  }
}
