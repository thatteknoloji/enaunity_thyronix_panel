interface ThyronixProductInput {
  name?: string; description?: string; brand?: string; category?: string;
  barcode?: string; stockCode?: string; modelCode?: string;
  price?: number; costPrice?: number; stock?: number; currency?: string;
  image?: string; images?: string; weight?: number; dimensions?: string;
  status?: string; vatRate?: number; deliveryTime?: string;
  manufacturer?: string; warranty?: string; shippingCost?: number; productUrl?: string;
}

type RowMap = Record<string, string>;

function autoDetectHeaders(headers: string[]): RowMap {
  const map: RowMap = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  const patterns: [string[], string][] = [
    [["name", "title", "urunadi", "ürün adı", "product name", "productname", "urun", "ürün", "adi", "adı"], "name"],
    [["description", "desc", "aciklama", "açıklama", "body", "detail", "detay"], "description"],
    [["brand", "marka", "vendor", "manufacturer", "uretici", "üretici"], "brand"],
    [["category", "kategori", "cat", "type", "producttype", "ürün tipi", "product category"], "category"],
    [["barcode", "barkod", "gtin", "ean", "upc"], "barcode"],
    [["sku", "stockcode", "stokkodu", "stok kodu", "stokcode", "stock code"], "stockCode"],
    [["modelcode", "modelkodu", "model", "mpn", "productcode", "ürün kodu", "urunkodu", "code"], "modelCode"],
    [["price", "fiyat", "satis", "satış", "listprice", "regularprice", "regular price", "amount", "tutar"], "price"],
    [["costprice", "alisfiyati", "alış", "maliyet", "alis"], "costPrice"],
    [["stock", "stok", "quantity", "qty", "miktar", "inventory", "adet"], "stock"],
    [["currency", "parabirimi", "para birimi", "cur"], "currency"],
    [["image", "resim", "img", "photo", "picture", "foto", "fotoğraf", "imageurl", "resimurl"], "image"],
    [["images", "resimler", "gallery", "galeri", "photos", "additional"], "images"],
    [["weight", "agirlik", "ağırlık", "kg", "kilo"], "weight"],
    [["dimensions", "ebat", "boyut", "boyutlar", "size", "ölçü", "olcu"], "dimensions"],
    [["vat", "kdv", "tax", "vergirate", "taxrate", "kdvorani", "kdv orani"], "vatRate"],
    [["delivery", "kargo", "cargo", "shipping", "shippingtime", "teslimat", "gönderim", "ship"], "deliveryTime"],
    [["url", "link", "producturl", "urunlink", "ürün link", "permalink"], "productUrl"],
  ];

  for (const [patternsList, target] of patterns) {
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (patternsList.some(p => lowerHeaders[i] === p || lowerHeaders[i].includes(p))) {
        map[headers[i]] = target;
        break;
      }
    }
  }

  return map;
}

function parseRow(row: Record<string, string>, fieldMap: RowMap): ThyronixProductInput {
  const product: ThyronixProductInput = {};

  for (const [colName, value] of Object.entries(row)) {
    const field = fieldMap[colName] || fieldMap[colName.toLowerCase()];
    if (!field || !value) continue;

    const numFields = ["price", "costPrice", "stock", "weight", "vatRate", "shippingCost"];
    if (numFields.includes(field)) {
      const n = Number(value.replace(/[^0-9.,-]/g, "").replace(",", "."));
      if (!isNaN(n)) (product as any)[field] = n;
    } else {
      (product as any)[field] = value;
    }
  }

  return product;
}

export function parseCsvToProducts(csvText: string): ThyronixProductInput[] {
  // Use built-in parsing for simple CSV
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(/[,;\t]/).map(h => h.trim().replace(/^"|"$/g, ""));
  const fieldMap = autoDetectHeaders(headers);

  const products: ThyronixProductInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || "").trim().replace(/^"|"$/g, ""); });
    products.push(parseRow(row, fieldMap));
  }

  return products;
}

export function parseExcelToProducts(buffer: ArrayBuffer): ThyronixProductInput[] {
  try {
    const XLSX = require("xlsx");
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return [];

    const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!raw.length) return [];

    const headers = ((raw[0] || []) as unknown[]).map((h: unknown) => String(h).trim());
    const fieldMap = autoDetectHeaders(headers);

    const products: ThyronixProductInput[] = [];
    for (let i = 1; i < raw.length; i++) {
      const row: Record<string, string> = {};
      const vals: unknown[] = raw[i] || [];
      headers.forEach((h, idx) => { row[h] = String(vals?.[idx] || "").trim(); });
      if (!Object.values(row).some(v => v)) continue;
      products.push(parseRow(row, fieldMap));
    }

    return products;
  } catch {
    return [];
  }
}
