import { parseVariantData } from "./source-metadata";
import type { FeedTemplate } from "./templates";

export type FeedOutputVariant = {
  id?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  stock: number;
  image?: string;
  options: Array<{ group: string; value: string }>;
};

export type FeedOutputProduct = Record<string, unknown> & {
  stock?: number | null;
  vatRate?: number | null;
  variants?: FeedOutputVariant[];
};

function normalizeOptionValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("#text" in record) return normalizeOptionValue(record["#text"]);
    if ("value" in record) return normalizeOptionValue(record.value);
    if ("Deger" in record) return normalizeOptionValue(record.Deger);
    if ("deger" in record) return normalizeOptionValue(record.deger);
    if ("Tanim" in record) return normalizeOptionValue(record.Tanim);
    if (Array.isArray(value)) {
      return value.map(normalizeOptionValue).filter(Boolean).join(", ");
    }
    return "";
  }
  return String(value).trim();
}

function normalizeVariantOptions(raw: unknown): Array<{ group: string; value: string }> {
  let options: Array<{ group: string; value: string }> = [];
  if (Array.isArray(raw)) {
    options = raw as Array<{ group: string; value: string }>;
  } else if (typeof raw === "string") {
    try {
      options = JSON.parse(raw || "[]");
    } catch {
      options = [];
    }
  }

  return options
    .map((opt) => ({
      group: String(opt?.group || "").trim(),
      value: normalizeOptionValue(opt?.value),
    }))
    .filter((opt) => opt.group && opt.value && !opt.value.includes("[object Object]"));
}

export function normalizeFeedOutputVariant(raw: Record<string, unknown>): FeedOutputVariant {
  const options = normalizeVariantOptions(raw.options);
  return {
    id: raw.id ? String(raw.id) : undefined,
    sku: raw.sku ? String(raw.sku) : undefined,
    barcode: raw.barcode ? String(raw.barcode) : undefined,
    price: typeof raw.price === "number" ? raw.price : raw.price != null ? Number(raw.price) : undefined,
    stock: Number(raw.stock) || 0,
    image: raw.image ? String(raw.image) : undefined,
    options,
  };
}

export function isBrokenVariantData(raw?: string | null): boolean {
  if (!raw) return false;
  return raw.includes("[object Object]");
}

/** Kullanıcının Sabit Değerler'den girdiği KDV'yi null ürünlere uygula (yeniden sync gerekmez). */
export function applySourceFixedVat<T extends FeedOutputProduct & { sourceId?: string }>(
  products: T[],
  sourceVatDefaults: Map<string, number>,
): T[] {
  if (sourceVatDefaults.size === 0) return products;
  return products.map((product) => {
    if (product.vatRate !== null && product.vatRate !== undefined) return product;
    const configured = product.sourceId ? sourceVatDefaults.get(product.sourceId) : undefined;
    if (configured === undefined) return product;
    return { ...product, vatRate: configured };
  });
}

/** Varyant stoklarını ana ürüne yansıt; KDV/stok alanlarını çıktı için hazırla. */
export function prepareProductsForFeedOutput<T extends FeedOutputProduct>(
  products: T[],
  _template?: FeedTemplate,
): Array<T & { variants?: FeedOutputVariant[]; stock: number; vatRate: number | null }> {
  return products.map((product) => {
    const variants = parseVariantData((product as { variantData?: string | null }).variantData).map((item) =>
      normalizeFeedOutputVariant(item),
    );

    const variantStockTotal = variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);
    const baseStock = Number(product.stock) || 0;
    const stock = baseStock > 0 ? baseStock : variantStockTotal;

    const vatRate =
      product.vatRate === null || product.vatRate === undefined
        ? null
        : Number(product.vatRate);

    return {
      ...product,
      stock,
      vatRate: Number.isFinite(vatRate as number) ? (vatRate as number) : null,
      variants: variants.length > 0 ? variants : undefined,
    };
  });
}
