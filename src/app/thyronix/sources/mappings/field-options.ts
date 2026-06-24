export type MappingFieldOption = {
  v: string;
  l: string;
  req?: boolean;
};

export const TARGET_FIELDS: MappingFieldOption[] = [
  { v: "name", l: "Ürün Adı", req: true },
  { v: "description", l: "Açıklama" },
  { v: "brand", l: "Marka" },
  { v: "category", l: "Kategori" },
  { v: "subcategory", l: "Alt Kategori" },
  { v: "externalId", l: "Harici ID" },
  { v: "barcode", l: "Barkod" },
  { v: "stockCode", l: "Stok Kodu" },
  { v: "modelCode", l: "Model Kodu" },
  { v: "price", l: "Fiyat", req: true },
  { v: "discountedPrice", l: "İndirimli Fiyat" },
  { v: "costPrice", l: "Maliyet Fiyatı" },
  { v: "stock", l: "Stok" },
  { v: "currency", l: "Para Birimi" },
  { v: "image", l: "Ana Görsel" },
  { v: "images", l: "Görseller" },
  { v: "weight", l: "Ağırlık" },
  { v: "dimensions", l: "Boyutlar" },
  { v: "vatRate", l: "KDV" },
  { v: "deliveryTime", l: "Teslim Süresi" },
  { v: "manufacturer", l: "Üretici" },
  { v: "warranty", l: "Garanti" },
  { v: "shippingCost", l: "Kargo Ücreti" },
  { v: "productUrl", l: "Ürün Linki" },
  { v: "status", l: "Durum" },
];

export const VARIANT_TARGET_FIELDS: MappingFieldOption[] = [
  { v: "variantBarcode", l: "Varyant Barkod" },
  { v: "variantSku", l: "Varyant SKU" },
  { v: "variantPrice", l: "Varyant Fiyat" },
  { v: "variantStock", l: "Varyant Stok" },
  { v: "variantImage", l: "Varyant Görsel" },
  { v: "variantIgnore", l: "Yoksay" },
];
