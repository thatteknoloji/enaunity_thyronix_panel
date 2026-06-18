import { prisma } from "@/lib/db";

export type ResolvedStockProduct = {
  productId: string | null;
  productName?: string;
  matchedBy?: "productId" | "catalog_barcode" | "catalog_sku" | "sku" | "barcode" | null;
  unmatched: boolean;
  warning?: string;
};

export async function findProductByCatalogItem(catalogItemId: string) {
  const catalog = await prisma.productCatalogItem.findUnique({ where: { id: catalogItemId } });
  if (!catalog) return null;
  return findProductBySkuOrBarcode({ sku: catalog.sku, barcode: catalog.barcode, name: catalog.name });
}

export async function findProductBySkuOrBarcode(params: {
  sku?: string;
  barcode?: string;
  name?: string;
}) {
  if (params.barcode) {
    const byBarcode = await prisma.product.findFirst({ where: { barcode: params.barcode } });
    if (byBarcode) return byBarcode;
  }
  if (params.sku) {
    const bySku = await prisma.product.findFirst({ where: { sku: params.sku } });
    if (bySku) return bySku;
  }
  if (params.name) {
    const byName = await prisma.product.findFirst({
      where: { name: { contains: params.name.slice(0, 40) } },
    });
    if (byName) return byName;
  }
  return null;
}

type OrderItemLike = {
  id?: string;
  productId?: string | null;
  productCatalogItemId?: string | null;
  sku?: string;
  barcode?: string;
  name?: string;
};

export async function resolveStockProductForOrderItem(
  orderItem: OrderItemLike
): Promise<ResolvedStockProduct> {
  if (orderItem.productId) {
    const product = await prisma.product.findUnique({ where: { id: orderItem.productId } });
    if (product) {
      return {
        productId: product.id,
        productName: product.name,
        matchedBy: "productId",
        unmatched: false,
      };
    }
    const fromCatalogId = await findProductByCatalogItem(orderItem.productId);
    if (fromCatalogId) {
      return {
        productId: fromCatalogId.id,
        productName: fromCatalogId.name,
        matchedBy: "catalog_barcode",
        unmatched: false,
      };
    }
  }

  if (orderItem.productCatalogItemId) {
    const product = await findProductByCatalogItem(orderItem.productCatalogItemId);
    if (product) {
      return {
        productId: product.id,
        productName: product.name,
        matchedBy: orderItem.barcode ? "catalog_barcode" : "catalog_sku",
        unmatched: false,
      };
    }
  }

  const product = await findProductBySkuOrBarcode({
    sku: orderItem.sku,
    barcode: orderItem.barcode,
    name: orderItem.name,
  });
  if (product) {
    return {
      productId: product.id,
      productName: product.name,
      matchedBy: orderItem.barcode ? "barcode" : "sku",
      unmatched: false,
    };
  }

  return {
    productId: null,
    unmatched: true,
    warning: `Stok eşleşmedi: ${orderItem.name || orderItem.sku || orderItem.productCatalogItemId || "ürün"}`,
  };
}
