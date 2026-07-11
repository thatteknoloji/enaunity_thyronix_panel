export type ProductColumnMapping = {
  name?: string;
  description?: string;
  brand?: string;
  barcode?: string;
  stockCode?: string;
  categoryPath?: string;
  price?: string;
  stock?: string;
  currency?: string;
  productUrl?: string;
  imageColumns: string[];
};

const COLUMN_ALIASES: Record<keyof Omit<ProductColumnMapping, "imageColumns">, string[]> = {
  name: [
    "Ürün Adı", "Product Name", "name", "productName", "title", "Başlık", "baslik",
    "urun_adi", "urun adi", "ürün adı", "product_name", "urunadi",
  ],
  description: [
    "Açıklama", "Description", "description", "Ürün Açıklaması", "urun_aciklamasi",
    "aciklama", "açıklama", "product_description", "urun aciklamasi",
  ],
  brand: ["Marka", "Brand", "brand", "marka"],
  barcode: ["Barkod", "Barcode", "GTIN", "EAN", "barkod", "gtin", "ean", "ürün kodu", "urun kodu"],
  stockCode: [
    "Stok Kodu", "SKU", "Stock Code", "sku", "stok_kodu", "model_kodu", "model kodu",
    "stok kodu", "ürün kodu", "urun kodu", "product code",
  ],
  categoryPath: [
    "Kategori", "Category", "categoryPath", "category", "kategori", "category_path",
    "kategori yolu", "Kategori Yolu", "category path",
  ],
  price: [
    "Trendyol'da Satılacak Fiyat", "Trendyolda Satilacak Fiyat", "Satış Fiyatı",
    "Satis Fiyati", "Fiyat", "Price", "Sale Price", "fiyat", "sale_price", "satis_fiyati",
    "satış fiyatı", "piyasa satış fiyatı", "Piyasa Satış Fiyatı", "Piyasa Satis Fiyati",
    "market price", "list price",
  ],
  stock: [
    "Stok Miktarı", "Stok Miktari", "Stok", "Stock", "stock", "stok", "quantity",
    "adet", "miktar", "qty", "stok_miktari",
  ],
  currency: ["Para Birimi", "Currency", "currency", "para birimi", "para_birimi"],
  productUrl: [
    "Ürün Linki", "Urun Linki", "productUrl", "product_url", "ürün linki", "urun linki",
    "trendyol linki", "Trendyol Linki", "kaynak url", "Kaynak URL", "url", "link",
  ],
};

const IMAGE_ALIASES = [
  "Resim", "Resim 1", "Resim1", "Image", "Image 1", "Görsel", "Gorsel", "imageUrl",
  "image1", "image2", "image3", "image4", "image5", "image6", "image7", "image8",
  "Görsel 1", "Görsel 2", "Görsel 3", "Görsel 4", "Görsel 5", "Görsel 6", "Görsel 7", "Görsel 8",
  "Gorsel 1", "Gorsel 2", "Gorsel 3", "Gorsel 4", "Gorsel 5", "Gorsel 6", "Gorsel 7", "Gorsel 8",
  "resim", "resim_1", "resim_2", "resim_3", "resim_4", "resim_5", "resim_6", "resim_7", "resim_8",
  "gorsel", "gorsel_1", "gorsel_2", "gorsel_url", "image_url", "images", "foto", "Foto",
  "görsel", "gorsel 1", "gorsel 2", "gorsel 3", "gorsel 4", "gorsel 5", "gorsel 6", "gorsel 7", "gorsel 8",
];

function normKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

function findColumn(columns: string[], aliases: string[]): string | undefined {
  const normalized = columns.map((c) => ({ raw: c, norm: normKey(c) }));
  for (const alias of aliases) {
    const target = normKey(alias);
    const match = normalized.find((c) => c.norm === target);
    if (match) return match.raw;
  }
  for (const alias of aliases) {
    const target = normKey(alias);
    const match = normalized.find((c) => c.norm.includes(target) || target.includes(c.norm));
    if (match) return match.raw;
  }
  return undefined;
}

function findImageColumns(columns: string[]): string[] {
  const found: string[] = [];
  for (const col of columns) {
    const n = normKey(col);
    if (IMAGE_ALIASES.some((a) => normKey(a) === n || n.includes(normKey(a)))) {
      found.push(col);
    }
    if (/^görsel\s*\d+$/i.test(col.trim()) || /^gorsel\s*\d+$/i.test(col.trim())) {
      if (!found.includes(col)) found.push(col);
    }
    if (/^image\s*\d+$/i.test(col.trim()) || /^resim\s*\d+$/i.test(col.trim())) {
      if (!found.includes(col)) found.push(col);
    }
  }
  return found.sort((a, b) => a.localeCompare(b, "tr"));
}

export function detectProductColumns(
  columns: string[],
  customMapping?: Partial<ProductColumnMapping>
): ProductColumnMapping {
  const salePrice = findColumn(columns, [
    "Trendyol'da Satılacak Fiyat", "Trendyolda Satilacak Fiyat", "Satış Fiyatı", "Satis Fiyati",
    "sale_price", "satis_fiyati",
  ]);
  const marketPrice = findColumn(columns, [
    "Piyasa Satış Fiyatı", "Piyasa Satis Fiyati", "market price",
  ]);

  const mapping: ProductColumnMapping = {
    name: customMapping?.name || findColumn(columns, COLUMN_ALIASES.name),
    description: customMapping?.description || findColumn(columns, COLUMN_ALIASES.description),
    brand: customMapping?.brand || findColumn(columns, COLUMN_ALIASES.brand),
    barcode: customMapping?.barcode || findColumn(columns, COLUMN_ALIASES.barcode),
    stockCode: customMapping?.stockCode || findColumn(columns, COLUMN_ALIASES.stockCode),
    categoryPath: customMapping?.categoryPath || findColumn(columns, COLUMN_ALIASES.categoryPath),
    price: customMapping?.price || salePrice || marketPrice || findColumn(columns, COLUMN_ALIASES.price),
    stock: customMapping?.stock || findColumn(columns, COLUMN_ALIASES.stock),
    currency: customMapping?.currency || findColumn(columns, COLUMN_ALIASES.currency),
    productUrl: customMapping?.productUrl || findColumn(columns, COLUMN_ALIASES.productUrl),
    imageColumns: customMapping?.imageColumns?.length
      ? customMapping.imageColumns
      : findImageColumns(columns),
  };
  return mapping;
}

export function getDetectedColumnsSummary(mapping: ProductColumnMapping): Record<string, string | string[]> {
  return {
    name: mapping.name || "(bulunamadı)",
    description: mapping.description || "(bulunamadı)",
    brand: mapping.brand || "(bulunamadı)",
    barcode: mapping.barcode || "(bulunamadı)",
    stockCode: mapping.stockCode || "(bulunamadı)",
    categoryPath: mapping.categoryPath || "(bulunamadı)",
    price: mapping.price || "(bulunamadı)",
    stock: mapping.stock || "(bulunamadı)",
    currency: mapping.currency || "(bulunamadı)",
    productUrl: mapping.productUrl || "(bulunamadı)",
    images: mapping.imageColumns.length ? mapping.imageColumns : "(bulunamadı)",
  };
}
