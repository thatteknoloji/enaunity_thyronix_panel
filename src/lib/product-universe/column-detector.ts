export type ProductColumnMapping = {
  name?: string;
  description?: string;
  brand?: string;
  barcode?: string;
  stockCode?: string;
  categoryPath?: string;
  price?: string;
  imageColumns: string[];
};

const COLUMN_ALIASES: Record<keyof Omit<ProductColumnMapping, "imageColumns">, string[]> = {
  name: ["Ürün Adı", "Product Name", "name", "title", "Başlık", "urun_adi", "product_name", "urun adi"],
  description: ["Açıklama", "Description", "description", "Ürün Açıklaması", "urun_aciklamasi", "product_description"],
  brand: ["Marka", "Brand", "brand", "marka"],
  barcode: ["Barkod", "Barcode", "GTIN", "EAN", "barkod", "gtin", "ean"],
  stockCode: ["Stok Kodu", "SKU", "Stock Code", "sku", "stok_kodu", "model_kodu", "model kodu"],
  categoryPath: ["Kategori", "Category", "categoryPath", "category", "kategori", "category_path"],
  price: ["Fiyat", "Price", "Sale Price", "fiyat", "sale_price", "satis_fiyati"],
};

const IMAGE_ALIASES = [
  "Resim", "Resim 1", "Resim1", "Image", "Image 1", "Görsel", "imageUrl",
  "image1", "image2", "image3", "image4", "image5", "image6", "image7", "image8",
  "resim", "resim_1", "resim_2", "resim_3", "resim_4", "resim_5", "resim_6", "resim_7", "resim_8",
  "gorsel", "gorsel_1", "gorsel_2", "gorsel_url", "image_url", "images",
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
  }
  return found;
}

export function detectProductColumns(
  columns: string[],
  customMapping?: Partial<ProductColumnMapping>
): ProductColumnMapping {
  const mapping: ProductColumnMapping = {
    name: customMapping?.name || findColumn(columns, COLUMN_ALIASES.name),
    description: customMapping?.description || findColumn(columns, COLUMN_ALIASES.description),
    brand: customMapping?.brand || findColumn(columns, COLUMN_ALIASES.brand),
    barcode: customMapping?.barcode || findColumn(columns, COLUMN_ALIASES.barcode),
    stockCode: customMapping?.stockCode || findColumn(columns, COLUMN_ALIASES.stockCode),
    categoryPath: customMapping?.categoryPath || findColumn(columns, COLUMN_ALIASES.categoryPath),
    price: customMapping?.price || findColumn(columns, COLUMN_ALIASES.price),
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
    images: mapping.imageColumns.length ? mapping.imageColumns : "(bulunamadı)",
  };
}
