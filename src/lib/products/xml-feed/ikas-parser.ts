import { XMLParser } from "fast-xml-parser";
import type { ParsedImportRow } from "../marketplace-import/types";

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && value !== null && "#text" in value) {
    return String((value as Record<string, unknown>)["#text"] ?? "").trim();
  }
  return String(value).trim();
}

function num(value: unknown): number {
  const parsed = Number.parseFloat(text(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCategoryPath(raw: string): string {
  return raw
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" >>> ");
}

function collectVariantImages(variant: Record<string, unknown>): string[] {
  const images = asArray(
    (variant.images as Record<string, unknown> | undefined)?.image,
  );
  const urls = images
    .map((img) => text((img as Record<string, unknown>)?.imageUrl))
    .filter((u) => u.startsWith("http"));
  return [...new Set(urls)];
}

function variantBarcode(variant: Record<string, unknown>): string {
  const list = variant.barcodeList as Record<string, unknown> | undefined;
  const codes = asArray(list?.barcode).map(text).filter(Boolean);
  return codes[0] || "";
}

function variantSellPrice(variant: Record<string, unknown>): number {
  const prices = variant.prices as Record<string, unknown> | undefined;
  const priceNode = prices?.price;
  const nodes = asArray(priceNode);
  for (const node of nodes) {
    const sell = num((node as Record<string, unknown>)?.sellPrice);
    if (sell > 0) return sell;
  }
  return num((priceNode as Record<string, unknown> | undefined)?.sellPrice);
}

function variantStock(variant: Record<string, unknown>, productStock: number): number {
  const stocks = variant.stocks as Record<string, unknown> | undefined;
  const stockNodes = asArray(stocks?.stock);
  if (stockNodes.length) {
    return stockNodes.reduce<number>(
      (sum, s) => sum + Math.max(0, Math.floor(num((s as Record<string, unknown>)?.stockCount))),
      0,
    );
  }
  return Math.max(0, Math.floor(productStock));
}

function variantOptions(variant: Record<string, unknown>): Array<{ group: string; value: string }> {
  const values = variant.variantValues as Record<string, unknown> | undefined;
  const items = asArray(values?.variantValue ?? values?.value ?? values);
  const opts: Array<{ group: string; value: string }> = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const group = text(rec.name ?? rec.group ?? rec.key ?? "Seçenek");
    const value = text(rec.value ?? rec["#text"]);
    if (group && value) opts.push({ group, value });
  }
  return opts;
}

export function parseIkasXmlToRows(xml: string): {
  rows: ParsedImportRow[];
  categoryValues: string[];
  brandValues: string[];
  parseErrors: string[];
} {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    isArray: (_name, jpath) =>
      jpath.endsWith(".products.product") ||
      jpath.endsWith(".variants.variant") ||
      jpath.endsWith(".images.image") ||
      jpath.endsWith(".barcode") ||
      jpath.endsWith(".stock") ||
      jpath.endsWith(".price"),
  });

  const parsed = parser.parse(xml) as Record<string, unknown>;
  const products = asArray(
    (parsed.products as Record<string, unknown> | undefined)?.product,
  );

  const rows: ParsedImportRow[] = [];
  const parseErrors: string[] = [];
  const categories = new Set<string>();
  const brands = new Set<string>();

  let rowIndex = 0;
  for (const raw of products) {
    if (!raw || typeof raw !== "object") continue;
    const product = raw as Record<string, unknown>;
    if (text(product.deleted).toLowerCase() === "true") continue;

    const modelCode = text(product.id);
    const name = text(product.name);
    const description = text(product.description);
    const brand = text((product.brand as Record<string, unknown> | undefined)?.name);
    const categoryRaw = text(product.category_path) || text(product.cat2name) || text(product.cat1name);
    const category = categoryRaw ? normalizeCategoryPath(categoryRaw) : "";
    const productStock = Math.max(0, Math.floor(num(product.stock)));

    if (brand) brands.add(brand);
    if (category) categories.add(category);

    const variants = asArray(
      (product.variants as Record<string, unknown> | undefined)?.variant,
    );

    const buildRow = (variant: Record<string, unknown> | undefined, idx: number): ParsedImportRow => {
      const barcode = variant ? variantBarcode(variant) : "";
      const sku = variant ? text(variant.sku) : "";
      const sellPrice = variant ? variantSellPrice(variant) : 0;
      const images = variant ? collectVariantImages(variant) : [];
      const opts = variant ? variantOptions(variant) : [];
      const errors: string[] = [];
      if (!modelCode) errors.push("Ürün ID eksik");
      if (!barcode) errors.push("Barkod eksik");

      const uniqueSku = sku && sku !== modelCode ? sku : barcode || `${modelCode}-${idx + 1}`;

      return {
        rowIndex: rowIndex++,
        name: name || modelCode,
        description: description || name,
        brand,
        category,
        modelCode,
        sku: uniqueSku,
        barcode,
        price: sellPrice,
        stock: variant ? variantStock(variant, productStock) : productStock,
        image: images[0] || "",
        images,
        variantOptions: opts,
        raw: {
          externalId: modelCode,
          costPrice: sellPrice,
          variantId: variant ? text(variant.id) : "",
        },
        errors,
        warnings: sellPrice <= 0 ? ["Fiyat 0 veya geçersiz"] : [],
      };
    };

    if (!variants.length) {
      const row = buildRow(undefined, 0);
      if (row.errors.length) parseErrors.push(...row.errors.map((e) => `${modelCode}: ${e}`));
      rows.push(row);
      continue;
    }

    variants.forEach((variant, idx) => {
      if (!variant || typeof variant !== "object") return;
      const row = buildRow(variant as Record<string, unknown>, idx);
      if (row.errors.length) parseErrors.push(...row.errors.map((e) => `${modelCode}: ${e}`));
      rows.push(row);
    });
  }

  return {
    rows,
    categoryValues: [...categories].sort(),
    brandValues: [...brands].sort(),
    parseErrors,
  };
}

export function inspectIkasXml(xml: string) {
  const { rows, categoryValues, brandValues } = parseIkasXmlToRows(xml);
  const sample = rows[0];
  return {
    productCount: rows.length,
    detectedFields: [
      "id", "name", "description", "brand", "category_path", "variants", "sku",
      "barcode", "sellPrice", "stock", "imageUrl",
    ],
    variantFields: ["sku", "barcode", "sellPrice", "stockCount", "imageUrl"],
    categoryValues,
    brandValues,
    sampleValues: sample
      ? {
          id: sample.modelCode,
          name: sample.name,
          category: sample.category,
          barcode: sample.barcode,
          price: String(sample.price),
        }
      : {},
    groupCount: new Set(rows.map((r) => r.modelCode)).size,
    totalRows: rows.length,
  };
}
