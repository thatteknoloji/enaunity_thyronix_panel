import type { ThyronixProduct, ThyronixSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { groupByModelCode, extractCategoryValues } from "./grouper";
import { applyImportIdentityGeneration } from "./identity-generation";
import { savePreview } from "./preview-store";
import type { FieldMapping, GroupedProduct, ImportIdentityGenerationSettings, ParsedImportRow } from "./types";

type ThyronixProductWithSource = ThyronixProduct & { source: ThyronixSource };

type ThyronixVariantLike = {
  barcode?: unknown;
  sku?: unknown;
  price?: unknown;
  stock?: unknown;
  image?: unknown;
  options?: unknown;
};

const THYRONIX_IMPORT_MAPPING: FieldMapping = {
  name: "name",
  description: "description",
  brand: "brand",
  category: "category",
  modelCode: "modelCode",
  sku: "stockCode",
  barcode: "barcode",
  price: "price",
  stock: "stock",
  image: "image",
};

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = stringValue(value)
    .replace(/[₺$€£TL\s]/gi, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stockValue(value: unknown, fallback = 0): number {
  const parsed = Math.floor(numberValue(value, fallback));
  return parsed > 0 ? parsed : 0;
}

function parseJsonArray(value?: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeOptions(value: unknown): { group: string; value: string }[] {
  const raw = typeof value === "string" ? parseJsonArray(value) : Array.isArray(value) ? value : [];
  return raw
    .map((option) => {
      if (!option || typeof option !== "object") return null;
      const record = option as Record<string, unknown>;
      const group = stringValue(record.group || record.name || record.label || record.key);
      const optionValue = stringValue(record.value || record.option || record.text);
      return group && optionValue ? { group, value: optionValue } : null;
    })
    .filter((option): option is { group: string; value: string } => Boolean(option));
}

function collectImages(product: ThyronixProduct): string[] {
  const images = parseJsonArray(product.images).map(stringValue).filter(Boolean);
  if (product.image) images.unshift(product.image);
  return [...new Set(images.filter((image) => image.startsWith("http") || image.startsWith("/")))];
}

function baseModelCode(product: ThyronixProduct): string {
  return (
    stringValue(product.modelCode) ||
    stringValue(product.stockCode) ||
    stringValue(product.barcode) ||
    stringValue(product.externalId) ||
    product.id
  );
}

function baseSku(product: ThyronixProduct, modelCode: string): string {
  return stringValue(product.stockCode) || stringValue(product.barcode) || modelCode;
}

function createRow(
  product: ThyronixProductWithSource,
  rowIndex: number,
  variant?: ThyronixVariantLike,
): ParsedImportRow {
  const modelCode = baseModelCode(product);
  const images = collectImages(product);
  const variantOptions = normalizeOptions(variant?.options);
  const sku = stringValue(variant?.sku) || baseSku(product, modelCode);
  const barcode = stringValue(variant?.barcode) || stringValue(product.barcode);
  const price = numberValue(variant?.price, numberValue(product.discountedPrice ?? product.price));
  const stock = stockValue(variant?.stock, product.stock);
  const image = stringValue(variant?.image) || images[0] || "";
  const errors: string[] = [];

  if (!modelCode) errors.push("Model Kodu eksik");
  if (!sku) errors.push("Stok Kodu eksik");
  if (!barcode) errors.push("Barkod eksik");

  return {
    rowIndex,
    name: product.name || modelCode,
    description: product.description || product.name || modelCode,
    brand: product.brand || "",
    category: product.category || "",
    modelCode,
    sku,
    barcode,
    price,
    stock,
    image,
    images: image && !images.includes(image) ? [image, ...images] : images,
    variantOptions,
    raw: {
      thyronixProductId: product.id,
      thyronixSourceId: product.sourceId,
      thyronixSourceName: product.source.name,
      externalId: product.externalId,
      currency: product.currency,
      vatRate: product.vatRate,
    },
    errors,
    warnings: price <= 0 ? ["Fiyat 0 veya geçersiz"] : [],
  };
}

function rowsFromProduct(product: ThyronixProductWithSource, startIndex: number): ParsedImportRow[] {
  const variants = parseJsonArray(product.variantData) as ThyronixVariantLike[];
  if (!variants.length) return [createRow(product, startIndex)];
  return variants.map((variant, index) => createRow(product, startIndex + index, variant));
}

export async function createThyronixSourceImportPreview(sourceId: string, identityGeneration?: ImportIdentityGenerationSettings): Promise<{
  previewJobId: string;
  preset: "generic";
  fileName: string;
  totalRows: number;
  groupCount: number;
  ungroupedCount: number;
  groups: GroupedProduct[];
  categoryValues: string[];
  parseErrors: string[];
  columns: string[];
  mapping: FieldMapping;
}> {
  const source = await prisma.thyronixSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("Thyronix kaynağı bulunamadı");

  const products = await prisma.thyronixProduct.findMany({
    where: { sourceId, status: "active" },
    include: { source: true },
    orderBy: { createdAt: "asc" },
  });

  if (!products.length) {
    throw new Error("Bu Thyronix kaynağında içe aktarılacak aktif ürün bulunamadı");
  }

  let rowIndex = 1;
  const rows: ParsedImportRow[] = [];
  for (const product of products) {
    const productRows = rowsFromProduct(product, rowIndex);
    rows.push(...productRows);
    rowIndex += productRows.length;
  }

  const preparedRows = applyImportIdentityGeneration(rows, identityGeneration || {});
  const { groups, ungroupedRows } = groupByModelCode(preparedRows);
  const categoryValues = extractCategoryValues(groups);
  const previewJob = await prisma.productImportJob.create({
    data: {
      type: "generic",
      status: "PREVIEW",
      fileName: `Thyronix: ${source.name}`,
      sourceUrl: source.xmlUrl,
      productCount: groups.length,
      reportJson: JSON.stringify({
        source: "thyronix_manual_admin_import",
        sourceId,
        totalRows: preparedRows.length,
        ungroupedCount: ungroupedRows.length,
      }),
    },
  });

  await savePreview({
    jobId: previewJob.id,
    fileName: `Thyronix: ${source.name}`,
    preset: "generic",
    groups,
    totalRows: preparedRows.length,
  });

  return {
    previewJobId: previewJob.id,
    preset: "generic",
    fileName: `Thyronix: ${source.name}`,
    totalRows: preparedRows.length,
    groupCount: groups.length,
    ungroupedCount: ungroupedRows.length,
    groups,
    categoryValues,
    parseErrors: [],
    columns: [],
    mapping: THYRONIX_IMPORT_MAPPING,
  };
}
