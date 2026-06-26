import { prisma } from "@/lib/db";
import { listDealerProducts, parseVariants } from "@/lib/dealer-products/service";
import {
  buildFeedQuality,
  parseImagesJson,
  type AnalysisProductRecord,
  type AnalysisSourceCounts,
} from "@/lib/analysis/types";

const PRODUCT_LIMIT = 60;

function dedupeKey(record: AnalysisProductRecord): string {
  const barcode = record.barcode?.trim();
  if (barcode) return `bc:${barcode}`;
  return `${record.source}:${record.id}`;
}

function richnessScore(record: AnalysisProductRecord): number {
  const q = record.feedQuality;
  return (
    (q.hasBarcode ? 4 : 0) +
    (q.hasCategory ? 3 : 0) +
    (q.hasStockCode ? 2 : 0) +
    (q.hasModelCode ? 2 : 0) +
    (q.hasVat ? 2 : 0) +
    (q.hasCostPrice ? 3 : 0) +
    (q.hasDescription ? 2 : 0) +
    q.imageCount +
    q.variantCount
  );
}

function mergeRecords(records: AnalysisProductRecord[]): AnalysisProductRecord[] {
  const map = new Map<string, AnalysisProductRecord>();
  for (const record of records) {
    const key = dedupeKey(record);
    const existing = map.get(key);
    if (!existing || richnessScore(record) > richnessScore(existing)) {
      map.set(key, record);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, PRODUCT_LIMIT);
}

export async function loadDealerAnalysisProducts(dealerId: string): Promise<{
  products: AnalysisProductRecord[];
  sourceCounts: AnalysisSourceCounts;
}> {
  const records: AnalysisProductRecord[] = [];

  const [dealerProducts, store, packageAccess] = await Promise.all([
    listDealerProducts(dealerId, false),
    prisma.dealerStore.findUnique({
      where: { dealerId },
      include: {
        products: {
          where: { isActive: true },
          take: 40,
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    prisma.productPackageAccess.findMany({
      where: { dealerId, status: "ACTIVE" },
      include: {
        package: {
          select: { id: true, name: true, catalogIds: true },
        },
      },
      take: 10,
    }),
  ]);

  for (const product of dealerProducts) {
    const variants = parseVariants(product.variantsJson || "[]");
    records.push({
      id: `dp:${product.id}`,
      source: "dealer_product",
      sourceLabel: "Bayi Ürünü",
      name: product.name,
      description: product.description || null,
      brand: null,
      category: null,
      barcode: null,
      stockCode: null,
      modelCode: variants[0]?.label || null,
      price: product.basePrice || 0,
      costPrice: null,
      stock: 0,
      image: product.imageUrl || null,
      images: null,
      imageCount: product.imageUrl ? 1 : 0,
      vatRate: null,
      shippingCost: null,
      deliveryTime: null,
      feedQuality: buildFeedQuality({
        description: product.description,
        modelCode: variants[0]?.label,
        imageCount: product.imageUrl ? 1 : 0,
        variantCount: variants.length,
      }),
      updatedAt: product.updatedAt.toISOString(),
    });
  }

  if (store?.products.length) {
    const catalogItemIds = store.products.map((item) => item.productCatalogItemId);
    const catalogItems = await prisma.productCatalogItem.findMany({
      where: { id: { in: catalogItemIds }, status: "ACTIVE" },
    });
    const catalogMap = new Map(catalogItems.map((item) => [item.id, item]));

    for (const storeProduct of store.products) {
      const item = catalogMap.get(storeProduct.productCatalogItemId);
      if (!item) continue;
      const images = parseImagesJson(item.imagesJson);
      records.push({
        id: `sp:${storeProduct.id}`,
        source: "store_catalog",
        sourceLabel: "Mağaza Kataloğu",
        name: item.name,
        description: null,
        brand: item.brand || null,
        category: item.category || null,
        barcode: item.barcode || null,
        stockCode: item.sku || null,
        modelCode: item.sku || null,
        price: storeProduct.dealerPrice || item.salePrice || item.price || 0,
        costPrice: item.price > 0 ? item.price : null,
        stock: storeProduct.stock ?? item.stock ?? 0,
        image: images[0] || null,
        images: images.join(","),
        imageCount: images.length,
        vatRate: item.vatRate ?? null,
        shippingCost: null,
        deliveryTime: null,
        feedQuality: buildFeedQuality({
          category: item.category,
          barcode: item.barcode,
          stockCode: item.sku,
          modelCode: item.sku,
          vatRate: item.vatRate,
          costPrice: item.price > 0 ? item.price : null,
          imageCount: images.length,
          variantCount: 1,
        }),
        updatedAt: storeProduct.updatedAt.toISOString(),
      });
    }
  }

  const catalogIdSet = new Set<string>();
  for (const access of packageAccess) {
    try {
      const ids = JSON.parse(access.package.catalogIds || "[]") as string[];
      ids.forEach((id) => catalogIdSet.add(id));
    } catch {
      /* ignore */
    }
  }

  if (catalogIdSet.size > 0) {
    const packageItems = await prisma.productCatalogItem.findMany({
      where: {
        catalogId: { in: [...catalogIdSet] },
        status: "ACTIVE",
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });

    for (const item of packageItems) {
      const images = parseImagesJson(item.imagesJson);
      records.push({
        id: `pci:${item.id}`,
        source: "package_catalog",
        sourceLabel: "Hazır Ürün Deposu",
        name: item.name,
        description: null,
        brand: item.brand || null,
        category: item.category || null,
        barcode: item.barcode || null,
        stockCode: item.sku || null,
        modelCode: item.sku || null,
        price: item.salePrice || item.price || 0,
        costPrice: item.price > 0 ? item.price : null,
        stock: item.stock ?? 0,
        image: images[0] || null,
        images: images.join(","),
        imageCount: images.length,
        vatRate: item.vatRate ?? null,
        shippingCost: null,
        deliveryTime: null,
        feedQuality: buildFeedQuality({
          category: item.category,
          barcode: item.barcode,
          stockCode: item.sku,
          modelCode: item.sku,
          vatRate: item.vatRate,
          costPrice: item.price > 0 ? item.price : null,
          imageCount: images.length,
          variantCount: 1,
        }),
        updatedAt: item.updatedAt.toISOString(),
      });
    }
  }

  const products = mergeRecords(records);
  const sourceCounts: AnalysisSourceCounts = {
    dealerProduct: products.filter((item) => item.source === "dealer_product").length,
    storeCatalog: products.filter((item) => item.source === "store_catalog").length,
    packageCatalog: products.filter((item) => item.source === "package_catalog").length,
    total: products.length,
  };

  return { products, sourceCounts };
}

export async function loadAdminAnalysisProducts(): Promise<{
  products: AnalysisProductRecord[];
  sourceCounts: AnalysisSourceCounts;
}> {
  const catalogItems = await prisma.productCatalogItem.findMany({
    where: { status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    take: PRODUCT_LIMIT,
  });

  const records: AnalysisProductRecord[] = catalogItems.map((item) => {
    const images = parseImagesJson(item.imagesJson);
    return {
      id: `pci:${item.id}`,
      source: "platform_catalog",
      sourceLabel: "Canlı Ürün Kataloğu",
      name: item.name,
      description: null,
      brand: item.brand || null,
      category: item.category || null,
      barcode: item.barcode || null,
      stockCode: item.sku || null,
      modelCode: item.sku || null,
      price: item.salePrice || item.price || 0,
      costPrice: item.price > 0 ? item.price : null,
      stock: item.stock ?? 0,
      image: images[0] || null,
      images: images.join(","),
      imageCount: images.length,
      vatRate: item.vatRate ?? null,
      shippingCost: null,
      deliveryTime: null,
      feedQuality: buildFeedQuality({
        category: item.category,
        barcode: item.barcode,
        stockCode: item.sku,
        modelCode: item.sku,
        vatRate: item.vatRate,
        costPrice: item.price > 0 ? item.price : null,
        imageCount: images.length,
        variantCount: 1,
      }),
      updatedAt: item.updatedAt.toISOString(),
    };
  });

  const products = mergeRecords(records);
  const sourceCounts: AnalysisSourceCounts = {
    dealerProduct: 0,
    storeCatalog: 0,
    packageCatalog: 0,
    platformCatalog: products.length,
    total: products.length,
  };

  return { products, sourceCounts };
}
