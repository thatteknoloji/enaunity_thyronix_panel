import { prisma } from "@/lib/db";
import { trendyol } from "@/lib/marketplaces/trendyol";

type TyConn = { sellerId: string; apiKey: string; apiSecret: string };

const PLACEHOLDER_BY_CATEGORY: Record<string, string> = {
  "Cam Tablo": "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&h=400&fit=crop",
  "Mdf Tablo": "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&h=400&fit=crop",
  Puzzle: "https://images.unsplash.com/photo-1580541832628-2a7131ee809f?w=400&h=400&fit=crop",
  Halı: "https://images.unsplash.com/photo-1600166898405-da9535204843?w=400&h=400&fit=crop",
  Perde: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=400&h=400&fit=crop",
  Nevresim: "https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=400&h=400&fit=crop",
  default: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
};

function detectCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("cam") || n.includes("tablo")) return "Cam Tablo";
  if (n.includes("halı") || n.includes("hali") || n.includes("kilim")) return "Halı";
  if (n.includes("perde")) return "Perde";
  return "default";
}

function placeholderFor(name: string): string {
  const cat = detectCategory(name);
  return PLACEHOLDER_BY_CATEGORY[cat] || PLACEHOLDER_BY_CATEGORY.default;
}

type CatalogRow = { id: string; name: string; image: string; sku: string; barcode: string };

export async function loadDealerCatalogProducts(_dealerId: string): Promise<CatalogRow[]> {
  return prisma.product.findMany({
    select: { id: true, name: true, image: true, sku: true, barcode: true },
    take: 800,
  });
}

export async function resolveMarketplaceLineImage(
  line: { productName: string; barcode?: string; sku?: string; imageUrl?: string },
  catalog: CatalogRow[],
  tyConn?: TyConn
): Promise<string> {
  if (line.imageUrl?.trim()) return line.imageUrl.trim();

  const code = (line.barcode || line.sku || "").trim();
  if (code) {
    const matched = catalog.find((p) => p.barcode === code || p.sku === code);
    if (matched?.image) return matched.image;
  }

  if (tyConn && code) {
    try {
      const res = await trendyol.fetchProducts(
        { sellerId: tyConn.sellerId, apiKey: tyConn.apiKey, apiSecret: tyConn.apiSecret },
        { barcode: code, size: 1 }
      );
      const img = res.products?.[0]?.images?.[0]?.url;
      if (img) return img;
    } catch {
      /* TY ürün API yoksa placeholder */
    }
  }

  return placeholderFor(line.productName || "");
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
