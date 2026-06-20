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

export function marketplaceImagePlaceholder(productName: string): string {
  const cat = detectCategory(productName || "");
  return PLACEHOLDER_BY_CATEGORY[cat] || PLACEHOLDER_BY_CATEGORY.default;
}

export function normalizeImageUrl(url?: string): string {
  const u = (url || "").trim();
  if (!u || u === "/placeholder.svg" || u === "null" || u === "undefined") return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

export function isUsableImageUrl(url?: string): boolean {
  const u = normalizeImageUrl(url);
  return u.startsWith("http://") || u.startsWith("https://");
}

export function resolveMarketplaceItemImageUrl(input: {
  name: string;
  metaImage?: string;
  productImage?: string | null;
}): string {
  const meta = normalizeImageUrl(input.metaImage);
  if (isUsableImageUrl(meta)) return meta;
  const product = normalizeImageUrl(input.productImage || undefined);
  if (isUsableImageUrl(product)) return product;
  return marketplaceImagePlaceholder(input.name);
}
