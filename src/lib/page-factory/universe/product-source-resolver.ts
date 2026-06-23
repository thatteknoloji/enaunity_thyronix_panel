import { prisma } from "@/lib/db";
import type {
  ProductAttribute,
  ProductContentDNA,
  ProductEntity,
  ProductImage,
  ProductUniverse,
  ProductUniverseSourceType,
  ProductUniverseStatus,
  Prisma,
} from "@prisma/client";
import {
  resolveUniverseLimit,
  type UniverseProductSourceFilters,
  type UniverseSourceType,
} from "./universe-types";

export type UniverseProductBundle = ProductUniverse & {
  entities: ProductEntity[];
  attributes: ProductAttribute[];
  images: ProductImage[];
  contentDNA: ProductContentDNA | null;
};

export type UniverseProductSeed = {
  productId: string;
  productUniverseId: string;
  productName: string;
  sku: string;
  brand: string;
  category: string;
  sourceType: ProductUniverseSourceType;
  importJobId: string | null;
  qualityScore: number;
  slug: string;
};

const PRODUCT_INCLUDE = {
  entities: true,
  attributes: true,
  images: true,
  contentDNA: true,
} as const;

function parseImportJobId(metadataJson: string): string | null {
  try {
    const meta = JSON.parse(metadataJson || "{}") as { importJobId?: string; jobId?: string };
    return meta.importJobId || meta.jobId || null;
  } catch {
    return null;
  }
}

function matchesSourceType(
  product: Pick<ProductUniverse, "sourceType" | "metadataJson" | "sourceFileName">,
  sourceType: UniverseSourceType
): boolean {
  if (sourceType === "ALL" || sourceType === "PRODUCT_UNIVERSE") return true;
  if (sourceType === "XLSX") return product.sourceType === "XLSX";
  if (sourceType === "XML") return product.sourceType === "XML";
  if (sourceType === "CSV") return product.sourceType === "CSV";
  if (sourceType === "TRENDYOL") return product.sourceType === "TRENDYOL";

  if (sourceType === "THYRONIX") {
    try {
      const meta = JSON.parse(product.metadataJson || "{}") as { importSource?: string; bridgeType?: string };
      return (
        meta.importSource?.includes("THYRONIX") === true ||
        meta.bridgeType === "THYRONIX_BRIDGE_V1" ||
        product.sourceFileName.includes("THYRONIX")
      );
    } catch {
      return product.sourceFileName.includes("THYRONIX");
    }
  }

  if (sourceType === "PRODUCT_LIBRARY") {
    try {
      const meta = JSON.parse(product.metadataJson || "{}") as { importSource?: string; catalogId?: string };
      return meta.importSource === "PRODUCT_LIBRARY" || !!meta.catalogId;
    } catch {
      return false;
    }
  }

  return true;
}

export function buildUniverseProductWhere(
  filters: UniverseProductSourceFilters,
  opts: { dealerId?: string | null; isAdmin?: boolean }
): Prisma.ProductUniverseWhereInput {
  const where: Prisma.ProductUniverseWhereInput = {};

  if (filters.productIds?.length) {
    where.id = { in: filters.productIds };
  }

  if (filters.status) {
    where.status = filters.status as ProductUniverseStatus;
  } else {
    where.status = { not: "REJECTED" };
  }

  const minQ = filters.minQualityScore ?? 0;
  if (minQ > 0) {
    where.qualityScore = { gte: minQ };
  }

  if (filters.brand?.trim()) {
    where.brand = { contains: filters.brand.trim() };
  }

  if (filters.category?.trim()) {
    where.categoryPath = { contains: filters.category.trim() };
  }

  if (filters.hasImage === true) {
    where.images = { some: {} };
  }

  if (!opts.isAdmin && opts.dealerId) {
    where.dealerId = opts.dealerId;
  }

  const sourceType = filters.sourceType || "ALL";
  if (sourceType === "XLSX") where.sourceType = "XLSX";
  else if (sourceType === "XML") where.sourceType = "XML";
  else if (sourceType === "CSV") where.sourceType = "CSV";
  else if (sourceType === "TRENDYOL") where.sourceType = "TRENDYOL";

  return where;
}

export async function countUniverseProducts(
  filters: UniverseProductSourceFilters,
  opts: { dealerId?: string | null; isAdmin?: boolean }
): Promise<number> {
  const sourceType = filters.sourceType || "ALL";
  const where = buildUniverseProductWhere(filters, opts);

  if (sourceType === "THYRONIX" || sourceType === "PRODUCT_LIBRARY") {
    const products = await prisma.productUniverse.findMany({
      where,
      select: { id: true, sourceType: true, metadataJson: true, sourceFileName: true },
    });
    return products.filter((p) => matchesSourceType(p, sourceType)).length;
  }

  return prisma.productUniverse.count({ where });
}

export async function resolveUniverseProducts(
  filters: UniverseProductSourceFilters,
  opts: { dealerId?: string | null; isAdmin?: boolean }
): Promise<{ products: UniverseProductBundle[]; totalProducts: number }> {
  const sourceType = filters.sourceType || "ALL";
  const limit = resolveUniverseLimit(filters.limit, opts.isAdmin);
  const where = buildUniverseProductWhere(filters, opts);

  const totalProducts = await countUniverseProducts(filters, opts);

  if (totalProducts === 0) {
    return { products: [], totalProducts: 0 };
  }

  let products = await prisma.productUniverse.findMany({
    where,
    include: PRODUCT_INCLUDE,
    orderBy: [{ qualityScore: "desc" }, { updatedAt: "desc" }],
    take: Math.min(limit, totalProducts > 0 ? totalProducts : limit),
  });

  if (["THYRONIX", "PRODUCT_LIBRARY"].includes(sourceType)) {
    products = products.filter((p) => matchesSourceType(p, sourceType));
  }

  if (products.length > limit) {
    products = products.slice(0, limit);
  }

  return { products: products as UniverseProductBundle[], totalProducts };
}

export function normalizeProductForUniverse(product: UniverseProductBundle): UniverseProductSeed {
  return {
    productId: product.id,
    productUniverseId: product.id,
    productName: product.normalizedName || product.rawName,
    sku: product.stockCode || "",
    brand: product.brand || "",
    category: product.categoryPath || "",
    sourceType: product.sourceType,
    importJobId: parseImportJobId(product.metadataJson),
    qualityScore: product.qualityScore,
    slug: product.slug,
  };
}

export function mapProductToBlueprintSeed(product: UniverseProductBundle): UniverseProductSeed & {
  entities: ProductEntity[];
  attributes: ProductAttribute[];
  images: ProductImage[];
  contentDNA: ProductContentDNA | null;
  descriptionClean: string;
  price: number | null;
  barcode: string;
  duplicateGroupId: string | null;
  metadataJson: string;
} {
  return {
    ...normalizeProductForUniverse(product),
    entities: product.entities,
    attributes: product.attributes,
    images: product.images,
    contentDNA: product.contentDNA,
    descriptionClean: product.descriptionClean,
    price: product.price,
    barcode: product.barcode,
    duplicateGroupId: product.duplicateGroupId,
    metadataJson: product.metadataJson,
  };
}

export type UniverseProductSample = {
  id: string;
  name: string;
  brand: string;
  category: string;
  sourceType: string;
  qualityScore: number;
  status: string;
  imageCount: number;
};

export function toProductSample(product: UniverseProductBundle): UniverseProductSample {
  return {
    id: product.id,
    name: product.normalizedName || product.rawName,
    brand: product.brand,
    category: product.categoryPath,
    sourceType: product.sourceType,
    qualityScore: product.qualityScore,
    status: product.status,
    imageCount: product.images.length,
  };
}
