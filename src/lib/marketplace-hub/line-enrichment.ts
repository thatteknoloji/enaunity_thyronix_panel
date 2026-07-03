import { prisma } from "@/lib/db";
import { trendyol } from "@/lib/marketplaces/trendyol";
import { readJsonResponse } from "@/lib/marketplaces/http";
import {
  isUsableImageUrl,
  marketplaceImagePlaceholder,
  normalizeImageUrl,
  resolveMarketplaceItemImageUrl,
} from "./marketplace-image";
import { matchProductLine, type ProductMatchResult } from "./product-match";

export {
  isUsableImageUrl,
  marketplaceImagePlaceholder,
  normalizeImageUrl,
  resolveMarketplaceItemImageUrl,
} from "./marketplace-image";

type TyConn = { sellerId: string; apiKey: string; apiSecret: string };

type CatalogRow = { id: string; name: string; image: string; sku: string; barcode: string };

export async function loadDealerCatalogProducts(_dealerId: string): Promise<CatalogRow[]> {
  return prisma.product.findMany({
    select: { id: true, name: true, image: true, sku: true, barcode: true },
    take: 800,
  });
}

async function fetchTrendyolProductImage(tyConn: TyConn, code: string): Promise<string> {
  try {
    const res = await trendyol.fetchProducts(
      { sellerId: tyConn.sellerId, apiKey: tyConn.apiKey, apiSecret: tyConn.apiSecret },
      { barcode: code, size: 1 }
    );
    const img = normalizeImageUrl(res.products?.[0]?.images?.[0]?.url);
    if (img) return img;
  } catch {
    /* sapigw yoksa integration dene */
  }

  try {
    const auth = Buffer.from(`${tyConn.apiKey}:${tyConn.apiSecret}`).toString("base64");
    const query = new URLSearchParams({ barcode: code, page: "0", size: "1", approved: "true" });
    const url = `https://apigw.trendyol.com/integration/product/sellers/${tyConn.sellerId}/products?${query}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        "User-Agent": `${tyConn.sellerId} - SelfIntegration`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return "";
    const json = await readJsonResponse<{ content?: Array<{ images?: Array<{ url?: string }> }> }>(
      res,
      "Trendyol product image lookup"
    );
    return normalizeImageUrl(json.content?.[0]?.images?.[0]?.url);
  } catch {
    return "";
  }
}

export async function resolveMarketplaceLineImage(
  line: { productName: string; barcode?: string; sku?: string; imageUrl?: string },
  catalog: CatalogRow[],
  dealerId: string,
  tyConn?: TyConn,
  match?: ProductMatchResult
): Promise<string> {
  const fromLine = normalizeImageUrl(line.imageUrl);
  if (isUsableImageUrl(fromLine)) return fromLine;

  const code = (line.barcode || line.sku || "").trim();
  if (code) {
    const matched = catalog.find((p) => p.barcode === code || p.sku === code);
    const catalogImg = normalizeImageUrl(matched?.image);
    if (isUsableImageUrl(catalogImg)) return catalogImg;
  }

  const matched = match || await matchProductLine({
    barcode: line.barcode,
    sku: line.sku || line.barcode,
    name: line.productName,
    dealerId,
  });
  const productImg = normalizeImageUrl(matched.product?.image);
  if (isUsableImageUrl(productImg)) return productImg;

  if (tyConn && code) {
    const tyImg = await fetchTrendyolProductImage(tyConn, code);
    if (tyImg) return tyImg;
  }

  return marketplaceImagePlaceholder(line.productName || "");
}

export async function enrichMarketplaceLines(
  lines: Array<{
    productName: string;
    barcode?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string;
  }>,
  dealerId: string,
  tyConn?: TyConn
) {
  const catalog = await loadDealerCatalogProducts(dealerId);
  const enriched = [];
  for (const line of lines) {
    const match = await matchProductLine({
      barcode: line.barcode,
      sku: line.sku || line.barcode,
      name: line.productName,
      dealerId,
    });
    const imageUrl = await resolveMarketplaceLineImage(line, catalog, dealerId, tyConn, match);
    enriched.push({
      ...line,
      imageUrl,
      matchedProductId: match.product?.id || "",
      catalogItemId: match.catalogItem?.id || "",
      thyronixProductId: "",
      matchedSource: match.matchedSource || "",
      matchScore: match.matchScore,
      matchedProductName: match.catalogItem?.name || match.product?.name || "",
    });
  }
  return enriched;
}
