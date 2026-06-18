import { prisma } from "@/lib/db";

export type MatchedCatalogItem = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  salePrice: number;
  brand?: string;
  category?: string;
  thyronixProductId?: string;
};

export type MatchedProduct = {
  id: string;
  name: string;
  image: string;
  price: number;
  category: string;
  sku: string;
  barcode: string;
  brand?: string;
};

export type ProductMatchResult = {
  catalogItem: MatchedCatalogItem | null;
  product: MatchedProduct | null;
  matchedSource: "catalog_barcode" | "catalog_sku" | "catalog_name" | "catalog_brand" | "catalog_category" | "product_barcode" | "product_sku" | "product_fuzzy" | "product_category" | null;
  matchScore: number;
};

function fuzzyMatch(lineName: string, productName: string): number {
  const l = lineName.toLowerCase().replace(/[^a-z0-9ğüşıöç ]/g, " ").replace(/\s+/g, " ").trim();
  const p = productName.toLowerCase().replace(/[^a-z0-9ğüşıöç ]/g, " ").replace(/\s+/g, " ").trim();

  if (p.length < 5 || l.length < 5) return 0;

  const lWords = l.split(" ").filter((w) => w.length >= 3);
  const pWords = p.split(" ").filter((w) => w.length >= 3);

  let score = 0;
  for (const lw of lWords) {
    for (const pw of pWords) {
      if (lw === pw) score += 3;
      else if (lw.includes(pw) || pw.includes(lw)) score += 1;
    }
  }

  return score;
}

function detectCategory(lineName: string): string {
  const categories: Record<string, string[]> = {
    "Cam Tablo": ["cam tablo", "camtablo", "kırılmaz cam", "cam baskı"],
    "Mdf Tablo": ["mdf tablo", "çerçeveli", "kanvas"],
    Puzzle: ["puzzle", "yapboz"],
    Halı: ["halı", "kilim", "yolluk"],
    Perde: ["perde"],
    Nevresim: ["nevresim"],
  };
  const lower = lineName.toLowerCase();
  for (const [cat, keys] of Object.entries(categories)) {
    if (keys.some((k) => lower.includes(k))) return cat;
  }
  return "";
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9ğüşıöç ]/g, " ").replace(/\s+/g, " ").trim();
}

function mapCatalogItem(item: {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  salePrice: number;
  brand?: string;
  category?: string;
}): MatchedCatalogItem {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    price: item.price,
    salePrice: item.salePrice,
    brand: item.brand,
    category: item.category,
    thyronixProductId: "",
  };
}

export async function matchCatalogItem(params: {
  barcode?: string;
  sku?: string;
  name?: string;
  brand?: string;
  category?: string;
}): Promise<MatchedCatalogItem | null> {
  const result = await matchProductLine({ ...params, matchMethod: "barcode" });
  return result.catalogItem;
}

export async function matchProductLine(params: {
  barcode?: string;
  sku?: string;
  name?: string;
  brand?: string;
  category?: string;
  matchMethod?: string;
}): Promise<ProductMatchResult> {
  const barcode = (params.barcode || "").trim();
  const sku = (params.sku || "").trim();
  const name = (params.name || "").trim();
  const matchMethod = params.matchMethod || "product_name";

  const empty: ProductMatchResult = {
    catalogItem: null,
    product: null,
    matchedSource: null,
    matchScore: 0,
  };

  // 1) ProductCatalogItem — barcode exact
  if (barcode) {
    const byBarcode = await prisma.productCatalogItem.findFirst({
      where: { barcode, status: "ACTIVE" },
    });
    if (byBarcode) {
      return {
        catalogItem: mapCatalogItem(byBarcode),
        product: null,
        matchedSource: "catalog_barcode",
        matchScore: 100,
      };
    }
  }

  // 2) ProductCatalogItem — sku exact
  if (sku) {
    const bySku = await prisma.productCatalogItem.findFirst({
      where: { sku, status: "ACTIVE" },
    });
    if (bySku) {
      return {
        catalogItem: mapCatalogItem(bySku),
        product: null,
        matchedSource: "catalog_sku",
        matchScore: 95,
      };
    }
  }

  // 3) ProductCatalogItem — normalized name
  if (name.length >= 4) {
    const normalized = normalizeName(name);
    const byName = await prisma.productCatalogItem.findFirst({
      where: {
        status: "ACTIVE",
        OR: [
          { name: { contains: name.slice(0, 24) } },
          { name: { contains: normalized.slice(0, 24) } },
        ],
      },
    });
    if (byName) {
      return {
        catalogItem: mapCatalogItem(byName),
        product: null,
        matchedSource: "catalog_name",
        matchScore: 70,
      };
    }
  }

  // 4) ProductCatalogItem — brand fallback
  if (params.brand) {
    const byBrand = await prisma.productCatalogItem.findFirst({
      where: { brand: params.brand, status: "ACTIVE" },
    });
    if (byBrand) {
      return {
        catalogItem: mapCatalogItem(byBrand),
        product: null,
        matchedSource: "catalog_brand",
        matchScore: 55,
      };
    }
  }

  // 5) ProductCatalogItem — category fallback
  const detectedCat = params.category || detectCategory(name);
  if (detectedCat) {
    const byCat = await prisma.productCatalogItem.findFirst({
      where: { category: { contains: detectedCat }, status: "ACTIVE" },
    });
    if (byCat) {
      return {
        catalogItem: mapCatalogItem(byCat),
        product: null,
        matchedSource: "catalog_category",
        matchScore: 50,
      };
    }
  }

  // 6) Product (ENA catalog) — compatibility fallback
  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true, image: true, price: true, category: true, sku: true, barcode: true, brand: true },
    take: 500,
  });

  let matchedProduct: MatchedProduct | null = null;
  let bestScore = 0;
  let matchedSource: ProductMatchResult["matchedSource"] = null;

  if (matchMethod === "barcode" && barcode) {
    const p = allProducts.find((x) => x.barcode === barcode || x.sku === barcode);
    if (p) {
      matchedProduct = p;
      matchedSource = "product_barcode";
      bestScore = 90;
    }
  }

  if (!matchedProduct && sku) {
    const p = allProducts.find((x) => x.sku === sku || x.barcode === sku);
    if (p) {
      matchedProduct = p;
      matchedSource = "product_sku";
      bestScore = 85;
    }
  }

  if (!matchedProduct && matchMethod === "category" && name) {
    for (const p of allProducts) {
      const word = name.split(" ").find((w) => w.length > 3 && p.category?.toLowerCase().includes(w.toLowerCase()));
      if (word) {
        matchedProduct = p;
        matchedSource = "product_category";
        bestScore = 60;
        break;
      }
    }
  }

  if (!matchedProduct && name) {
    for (const p of allProducts) {
      const s = fuzzyMatch(name, p.name);
      if (s > bestScore) {
        bestScore = s;
        matchedProduct = p;
        matchedSource = "product_fuzzy";
      }
    }
    if (bestScore < 2) {
      matchedProduct = null;
      matchedSource = null;
      bestScore = 0;
    }
  }

  if (matchedProduct) {
    return { catalogItem: null, product: matchedProduct, matchedSource, matchScore: bestScore };
  }

  return empty;
}

export function defaultCosts(totalAmount: number) {
  return {
    shippingCost: Math.max(90, Math.round(totalAmount * 0.05)),
    packagingCost: 15,
    serviceCost: totalAmount > 500 ? 20 : 10,
  };
}
