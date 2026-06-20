import { prisma } from "@/lib/db";
import { trendyol } from "@/lib/marketplaces/trendyol";
import {
  isUsableImageUrl,
  marketplaceImagePlaceholder,
  normalizeImageUrl,
  resolveMarketplaceItemImageUrl,
} from "./marketplace-image";

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
    const json = (await res.json()) as { content?: Array<{ images?: Array<{ url?: string }> }> };
    return normalizeImageUrl(json.content?.[0]?.images?.[0]?.url);
  } catch {
    return "";
  }
}

export async function resolveMarketplaceLineImage(
  line: { productName: string; barcode?: string; sku?: string; imageUrl?: string },
  catalog: CatalogRow[],
  tyConn?: TyConn
): Promise<string> {
  const fromLine = normalizeImageUrl(line.imageUrl);
  if (isUsableImageUrl(fromLine)) return fromLine;

  const code = (line.barcode || line.sku || "").trim();
  if (code) {
    const matched = catalog.find((p) => p.barcode === code || p.sku === code);
    const catalogImg = normalizeImageUrl(matched?.image);
    if (isUsableImageUrl(catalogImg)) return catalogImg;
  }

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
    const imageUrl = await resolveMarketplaceLineImage(line, catalog, tyConn);
    enriched.push({ ...line, imageUrl });
  }
  return enriched;
}
