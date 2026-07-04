export const PRODUCT_FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "productname", "product_name", "urunadi", "urun_adi", "ürünadı", "ürün adı", "urun ad", "adi", "isim", "title", "baslik", "başlık"],
  description: ["description", "desc", "detail", "aciklama", "açıklama", "urunaciklamasi", "urun_aciklama", "ürün açıklaması"],
  brand: ["brand", "brandname", "marka", "urunmarka", "urun_marka_ad", "manufacturerbrand"],
  category: ["category", "categoryname", "kategori", "kategoriadi", "kategori_ad", "urun_kategori_ad", "top_category", "main_category"],
  subcategory: ["subcategory", "sub_category", "altkategori", "alt kategori", "categories", "kategori_tree"],
  externalId: ["externalid", "external_id", "id", "productid", "product_id", "urunid", "urun_id", "urunkartiid", "urun_karti_id", "varyasyonid"],
  barcode: ["barcode", "barcod", "barkod", "barkodu", "ean", "gtin", "ozelbarkodkodu", "ozel_barkod_kodu"],
  stockCode: ["stockcode", "stock_code", "stokcode", "stokkodu", "stok_kodu", "sku", "merchantsku", "productcode", "product_code", "urun_kodu", "ozel_urun_kodu"],
  modelCode: ["modelcode", "model_code", "modelkodu", "model_kodu", "model", "productmainid", "product_main_id", "specCode1"],
  price: ["price", "fiyat", "satisfiyati", "satis_fiyati", "satış fiyatı", "siteprice", "site_price", "listprice", "list_price", "urun_fiyat", "urun_fiyat_bayi_ozel", "bayi_fiyati", "saleprice", "sale_price", "unit_price"],
  discountedPrice: ["discountedprice", "discounted_price", "indirimlifiyat", "indirimli_fiyat", "specialprice", "special_price"],
  salePrice: ["saleprice", "sale_price", "satilacakfiyat", "satilacak_fiyat", "satılacak fiyat", "trendyolda satilacak fiyat", "trendyol'da satılacak fiyat"],
  costPrice: ["costprice", "cost_price", "alisfiyati", "alis_fiyat", "alış fiyatı", "purchaseprice", "purchase_price"],
  stock: ["stock", "stok", "stokadedi", "stok_adedi", "stokmiktari", "stok_miktari", "stok miktarı", "quantity", "qty", "miktar", "inventory_quantity"],
  currency: ["currency", "parabirimi", "para_birimi", "pb", "currencytype"],
  image: ["image", "imageurl", "image_url", "image1", "resim", "resim1", "ana_gorsel", "ana görsel", "main_image_url"],
  images: ["images", "imageurls", "image_urls", "gallery", "resimler", "gorseller", "görseller"],
  weight: ["weight", "agirlik", "ağırlık", "desi", "dimensionalweight"],
  dimensions: ["dimensions", "dimension", "boyut", "boyutlar", "ebat"],
  vatRate: ["vatrate", "vat_rate", "vat", "tax", "taxrate", "tax_rate", "kdv", "kdvorani", "kdv_orani", "kdv oranı", "kdv (%)", "taxpercent"],
  deliveryTime: ["deliverytime", "delivery_time", "kargosuresi", "kargo_suresi", "shippingdays", "shipping_days", "deliveryduration"],
  manufacturer: ["manufacturer", "uretici", "üretici"],
  warranty: ["warranty", "garanti", "garantisuresi", "garanti_suresi", "warrantyperiod"],
  shippingCost: ["shippingcost", "shipping_cost", "kargoucreti", "kargo_ucreti", "kargo ücreti"],
  productUrl: ["producturl", "product_url", "urunlinki", "urun_linki", "ürün linki", "url", "link", "permalink"],
  status: ["status", "durum", "aktif", "productstatus"],
};

export const VARIANT_FIELD_ALIASES: Record<string, string[]> = {
  variantGroup: ["variantgroup", "variant_group", "varyantgrup", "varyant_grup", "name", "name1", "specname", "specname1", "attribute_name", "option_name"],
  variantValue: ["variantvalue", "variant_value", "varyantdeger", "varyant_deger", "value", "value1", "specvalue", "specvalue1", "attribute_value", "option_value", "color", "size", "renk", "beden", "olcu", "ölçü", "ebat", "numara", "desen"],
  variantBarcode: ["variantbarcode", "variant_barcode", "varyantbarkod", "varyant_barkod", "barcode", "barkod", "ean", "gtin"],
  variantSku: ["variantsku", "variant_sku", "varyantsku", "varyant_sku", "sku", "stockcode", "stokcode", "stokkodu", "stok_kodu", "productcode"],
  variantPrice: ["variantprice", "variant_price", "varyantfiyat", "varyant_fiyat", "price", "fiyat", "satisfiyati", "satis_fiyati", "indirimlifiyat", "indirimli_fiyat"],
  variantStock: ["variantstock", "variant_stock", "varyantstok", "varyant_stok", "stock", "stok", "quantity", "miktar"],
  variantImage: ["variantimage", "variant_image", "varyantgorsel", "varyant_gorsel", "image", "resim"],
};

export function normalizeFieldKey(value: unknown): string {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .replace(/[^a-z0-9]+/g, "");
}

function buildAliasIndex(aliases: Record<string, string[]>) {
  const index = new Map<string, string>();
  for (const [target, values] of Object.entries(aliases)) {
    index.set(normalizeFieldKey(target), target);
    for (const alias of values) index.set(normalizeFieldKey(alias), target);
  }
  return index;
}

const PRODUCT_ALIAS_INDEX = buildAliasIndex(PRODUCT_FIELD_ALIASES);
const VARIANT_ALIAS_INDEX = buildAliasIndex(VARIANT_FIELD_ALIASES);

export function guessProductField(column: string): string {
  const normalized = normalizeFieldKey(column);
  return PRODUCT_ALIAS_INDEX.get(normalized) || "";
}

export function guessVariantField(column: string): string {
  const normalized = normalizeFieldKey(column);
  return VARIANT_ALIAS_INDEX.get(normalized) || "";
}

export function buildSuggestedProductMapping(columns: string[]) {
  const mapping: Record<string, string> = {};
  const usedTargets = new Set<string>();
  for (const column of columns) {
    const target = guessProductField(column);
    if (!target || usedTargets.has(target)) continue;
    mapping[column] = target;
    usedTargets.add(target);
  }
  return mapping;
}

export function buildSuggestedVariantMapping(columns: string[]) {
  const mapping: Record<string, string> = {};
  const usedCoreTargets = new Set<string>();
  for (const column of columns) {
    const target = guessVariantField(column);
    if (!target) continue;
    if (target !== "variantValue" && usedCoreTargets.has(target)) continue;
    mapping[column] = target;
    if (target !== "variantValue") usedCoreTargets.add(target);
  }
  return mapping;
}
