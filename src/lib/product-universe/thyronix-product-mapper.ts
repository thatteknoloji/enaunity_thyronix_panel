import type { ThyronixProduct, ThyronixSource } from "@prisma/client";
import { cleanProductDescription } from "./description-cleaner";
import {
  generateProductSlug,
  normalizeProductName,
  parsePrice,
} from "./product-normalizer";

export const THYRONIX_BRIDGE_IMPORT_SOURCE = "THYRONIX_BRIDGE_V1" as const;

export type ThyronixBridgeMappedProduct = {
  thyronixProductId: string;
  thyronixSourceId: string;
  sourceName: string;
  sourceFileName: string;
  rawName: string;
  normalizedName: string;
  slug: string;
  brand: string;
  barcode: string;
  stockCode: string;
  categoryPath: string;
  descriptionRaw: string;
  descriptionClean: string;
  price: number | null;
  currency: string;
  stock: number;
  imageUrls: string[];
  variantData: string | null;
  metadata: Record<string, unknown>;
};

export function parseThyronixImageUrls(images: string | null | undefined): string[] {
  if (!images?.trim()) return [];
  const raw = images.trim();
  if (raw.startsWith("[") || raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter((u) => u.startsWith("http"));
      }
    } catch {
      /* fall through */
    }
  }
  return raw
    .split(/[,;|\n]+/)
    .map((s) => s.trim())
    .filter((u) => u.startsWith("http") || u.startsWith("//"));
}

export function mapThyronixProductToUniverse(
  product: ThyronixProduct,
  source: Pick<ThyronixSource, "id" | "name">,
): ThyronixBridgeMappedProduct {
  const rawName = product.name?.trim() || "İsimsiz Ürün";
  const normalizedName = normalizeProductName(rawName);
  const descriptionRaw = product.description?.trim() || "";
  const descriptionClean = cleanProductDescription(descriptionRaw);
  const brand = product.brand?.trim() || "";
  const barcode = product.barcode?.trim() || "";
  const stockCode = product.stockCode?.trim() || product.modelCode?.trim() || "";
  const categoryPath = product.category?.trim() || "";
  const priceValue =
    product.discountedPrice && product.discountedPrice > 0
      ? product.discountedPrice
      : product.price;
  const { price, currency } = parsePrice(priceValue);
  const imageUrls = parseThyronixImageUrls(product.images);
  const sourceFileName = `THYRONIX:${source.name}`;

  return {
    thyronixProductId: product.id,
    thyronixSourceId: source.id,
    sourceName: source.name,
    sourceFileName,
    rawName,
    normalizedName,
    slug: generateProductSlug(normalizedName, product.externalId?.slice(0, 8)),
    brand,
    barcode,
    stockCode,
    categoryPath,
    descriptionRaw,
    descriptionClean,
    price,
    currency: currency || product.currency || "TRY",
    stock: product.stock ?? 0,
    imageUrls,
    variantData: product.variantData,
    metadata: {
      thyronixProductId: product.id,
      thyronixSourceId: source.id,
      thyronixExternalId: product.externalId,
      sourceName: source.name,
      stock: product.stock ?? 0,
      rawStock: product.stock ?? 0,
      images: imageUrls,
      variantData: product.variantData ? tryParseJson(product.variantData) : null,
      importSource: THYRONIX_BRIDGE_IMPORT_SOURCE,
      thyronixStatus: product.status,
    },
  };
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
