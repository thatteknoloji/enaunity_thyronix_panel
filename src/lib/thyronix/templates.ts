export interface FieldMap {
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  barcode: string;
  stockCode?: string;
  modelCode?: string;
  externalId?: string;
  price: string;
  costPrice?: string;
  stock: string;
  currency?: string;
  image?: string;
  images?: string;
  weight?: string;
  dimensions?: string;
  status?: string;
  vatRate?: string;
  deliveryTime?: string;
  manufacturer?: string;
  warranty?: string;
  shippingCost?: string;
  productUrl?: string;
}

export interface FeedTemplate {
  id: string;
  name: string;
  group: string;
  rootElement: string;
  itemElement: string;
  variantElement?: string;
  variantItemElement?: string;
  encoding?: string;
  xmlHeader?: string;
  cdataFields: string[];
  fieldMap: FieldMap;
  notes?: string;
}

const ENCODING = '<?xml version="1.0" encoding="UTF-8"?>';

export const ALL_TEMPLATES: FeedTemplate[] = [
  // ─────────────── ENTEGRASYON FİRMALARI ───────────────
  {
    id: "jetteknoloji", name: "JetTeknoloji", group: "Entegrasyon",
    rootElement: "urunler", itemElement: "urun",
    variantElement: "varyantlar", variantItemElement: "varyant",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "urunAdi", description: "aciklama", brand: "marka", category: "kategoriAdi", barcode: "barkod", stockCode: "stokKodu", modelCode: "modelKodu", price: "fiyat", costPrice: "alisFiyati", stock: "stokAdedi", currency: "paraBirimi", image: "resim", images: "resimler", weight: "agirlik", dimensions: "ebat", vatRate: "kdvOrani", deliveryTime: "kargoSuresi", manufacturer: "uretici", warranty: "garantiSuresi", shippingCost: "kargoUcreti", productUrl: "urunLinki", status: "durum" },
    notes: "En yaygın entegratör, 500+ mağaza"
  },
  {
    id: "platinmarket", name: "PlatinMarket", group: "Entegrasyon",
    rootElement: "Products", itemElement: "Product",
    variantElement: "Variants", variantItemElement: "Variant",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "ProductName", description: "Description", brand: "Brand", category: "CategoryName", barcode: "Barcode", stockCode: "StockCode", modelCode: "ModelCode", price: "Price", costPrice: "CostPrice", stock: "Quantity", currency: "Currency", image: "ImageUrl", images: "ImageUrls", weight: "Weight", vatRate: "TaxRate", deliveryTime: "DeliveryTime", warranty: "Warranty", productUrl: "ProductUrl" },
  },
  {
    id: "xmlveri", name: "XMLVeri", group: "Entegrasyon",
    rootElement: "data", itemElement: "product",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "title", description: "desc", brand: "brand", category: "cat", barcode: "barcode", stockCode: "sku", price: "price", stock: "qty", currency: "currency", image: "img", weight: "weight", vatRate: "vat", productUrl: "url" },
  },
  {
    id: "entegrenet", name: "Entegre.NET", group: "Entegrasyon",
    rootElement: "products", itemElement: "item",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "name", description: "description", brand: "brand", category: "category", barcode: "barcode", stockCode: "stock_code", price: "price", stock: "stock", currency: "currency", image: "image", images: "gallery", weight: "weight", vatRate: "vat", productUrl: "url" },
  },
  {
    id: "xmlmarket", name: "XMLMarket", group: "Entegrasyon",
    rootElement: "items", itemElement: "Item",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "ItemName", description: "ItemDescription", brand: "BrandName", category: "CategoryName", barcode: "ItemBarcode", stockCode: "ItemCode", price: "ItemPrice", stock: "ItemQuantity", currency: "CurrencyType", image: "ItemImage", weight: "ItemWeight", vatRate: "TaxPercent", deliveryTime: "ShipmentTime", warranty: "WarrantyPeriod" },
  },
  {
    id: "diateknoloji", name: "DiaTeknoloji", group: "Entegrasyon",
    rootElement: "URUNLER", itemElement: "URUN",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "ADI", description: "ACIKLAMA", brand: "MARKA", category: "KATEGORI", barcode: "BARKOD", stockCode: "STOKKOD", price: "FIYAT", stock: "MIKTAR", currency: "PARABIRIMI", image: "RESIM", images: "RESIMLER", weight: "AGIRLIK", vatRate: "KDV", manufacturer: "URETICI", warranty: "GARANTI" },
  },
  {
    id: "logoisbasi", name: "Logo İşbaşı", group: "ERP",
    rootElement: "LOGOXML", itemElement: "PRODUCT",
    variantElement: "VARIANTS", variantItemElement: "VARIANT",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "PRODUCT_NAME", description: "PRODUCT_DESC", brand: "PRODUCT_BRAND", category: "CATEGORY", barcode: "PRODUCT_BARCODE", stockCode: "PRODUCT_CODE", modelCode: "PRODUCT_MODEL", price: "PRODUCT_PRICE", costPrice: "PRODUCT_COST", stock: "PRODUCT_STOCK", currency: "CURRENCY", image: "PRODUCT_IMAGE", weight: "WEIGHT", vatRate: "VAT_RATE", dimensions: "DIMENSIONS", status: "PRODUCT_STATUS", deliveryTime: "SHIPPING_DAYS", manufacturer: "MANUFACTURER" },
  },
  {
    id: "parasut", name: "Paraşüt", group: "Muhasebe",
    rootElement: "products", itemElement: "product",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "name", barcode: "barcode", stockCode: "stock_code", price: "unit_price", stock: "quantity", currency: "currency", vatRate: "vat_rate" },
    notes: "Muhasebe odaklı, sınırlı ürün alanı"
  },

  // ─────────────── E-TİCARET ALTYAPILARI ───────────────
  {
    id: "ticimax", name: "Ticimax", group: "E-Ticaret",
    rootElement: "Urunler", itemElement: "Urun",
    variantElement: "Varyantlar", variantItemElement: "Varyant",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "UrunAdi", description: "UrunAciklamasi", brand: "Marka", category: "Kategori", barcode: "Barkod", stockCode: "StokKodu", modelCode: "UrunKodu", price: "SatisFiyati", costPrice: "AlisFiyati", stock: "StokAdedi", currency: "ParaBirimi", image: "Resim", images: "Resimler", weight: "Agirlik", dimensions: "Boyutlar", vatRate: "KdvOrani", status: "Durum", deliveryTime: "KargoSuresi", manufacturer: "Uretici", warranty: "Garanti", shippingCost: "KargoUcreti", productUrl: "UrunLink" },
    notes: "50.000+ mağaza"
  },
  {
    id: "tsoft", name: "T-Soft", group: "E-Ticaret",
    rootElement: "products", itemElement: "product",
    variantElement: "variants", variantItemElement: "variant",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "product_name", description: "product_description", brand: "product_brand", category: "product_category", barcode: "product_barcode", stockCode: "product_code", modelCode: "model_code", price: "product_price", costPrice: "purchase_price", stock: "product_quantity", currency: "currency", image: "product_image", images: "product_images", weight: "product_weight", vatRate: "tax_rate", dimensions: "product_dimensions", deliveryTime: "shipping_time", warranty: "warranty_period", shippingCost: "shipping_cost", productUrl: "product_url" },
    notes: "40.000+ mağaza"
  },
  {
    id: "ideasoft", name: "Ideasoft", group: "E-Ticaret",
    rootElement: "Products", itemElement: "Product",
    variantElement: "Variants", variantItemElement: "Variant",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "Name", description: "Description", brand: "Brand", category: "Category", barcode: "Barcode", stockCode: "SKU", modelCode: "ModelCode", price: "Price", costPrice: "CostPrice", stock: "Quantity", currency: "Currency", image: "Image", images: "Images", weight: "Weight", dimensions: "Dimensions", vatRate: "VatRate", status: "Status", deliveryTime: "DeliveryTime", warranty: "Warranty", shippingCost: "ShippingCost", productUrl: "Url" },
    notes: "30.000+ mağaza"
  },
  {
    id: "projesoft", name: "Projesoft", group: "E-Ticaret",
    rootElement: "urunler", itemElement: "urun",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "urun_adi", description: "urun_aciklama", brand: "marka", category: "kategori", barcode: "barkod", stockCode: "stok_kodu", price: "fiyat", stock: "stok", currency: "para_birimi", image: "resim", weight: "agirlik", vatRate: "kdv" },
  },
  {
    id: "ikas", name: "ikas", group: "E-Ticaret",
    rootElement: "products", itemElement: "product",
    variantElement: "variants", variantItemElement: "variant",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "name", description: "description", brand: "brand", category: "category", barcode: "barcode", stockCode: "sku", modelCode: "modelCode", price: "price", costPrice: "costPrice", stock: "stock", currency: "currency", image: "image", images: "images", weight: "weight", dimensions: "dimensions", vatRate: "vatRate", deliveryTime: "deliveryTime", shippingCost: "shippingCost", productUrl: "productUrl" },
  },
  {
    id: "shopify", name: "Shopify", group: "E-Ticaret",
    rootElement: "products", itemElement: "product",
    variantElement: "variants", variantItemElement: "variant",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "title", description: "body_html", brand: "vendor", category: "product_type", barcode: "barcode", stockCode: "sku", price: "price", costPrice: "cost_price", stock: "inventory_quantity", currency: "currency", image: "image_src", images: "images", weight: "weight", dimensions: "dimensions", vatRate: "tax_rate", status: "status", productUrl: "handle" },
  },
  {
    id: "woocommerce", name: "WooCommerce", group: "E-Ticaret",
    rootElement: "products", itemElement: "product",
    variantElement: "variations", variantItemElement: "variation",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "name", description: "description", brand: "brand", category: "category", barcode: "barcode", stockCode: "sku", price: "regular_price", stock: "stock_quantity", currency: "currency", image: "image", images: "gallery", weight: "weight", dimensions: "dimensions", vatRate: "tax_class", deliveryTime: "shipping_days", shippingCost: "shipping_cost", productUrl: "permalink" },
  },
  {
    id: "woo_feed", name: "WooCommerce Feed Export", group: "E-Ticaret",
    rootElement: "products", itemElement: "product",
    xmlHeader: ENCODING,
    cdataFields: ["Description", "ProductName", "Category"],
    fieldMap: {
      name: "ProductName", description: "Description", brand: "Brand", category: "Category",
      barcode: "barcod", stockCode: "ProductCode", externalId: "ProductCode",
      price: "Price", stock: "Quantity", currency: "Currency", image: "ImageURL",
      images: "Images", productUrl: "ProductURL", vatRate: "TaxRate",
    },
    notes: "Woo feed plugin export — ProductName/Price/Quantity",
  },
  {
    id: "ebijuteri", name: "E-Bijuteri XML", group: "Entegrasyon",
    rootElement: "Urunler", itemElement: "Urun",
    xmlHeader: ENCODING,
    cdataFields: ["adi", "aciklama", "kategori"],
    fieldMap: {
      name: "adi", description: "aciklama", brand: "marka", category: "kategori",
      barcode: "barcode", stockCode: "stok_kodu", externalId: "product_id",
      price: "fiyat", costPrice: "fiyat", stock: "miktar", currency: "para_birimi",
      image: "resim", images: "resim", vatRate: "kdv", productUrl: "url",
    },
    notes: "xml.ebijuteri.com — Urunler/Urun, fiyat.bayi_fiyati",
  },

  // ─────────────── PAZAR YERLERİ ───────────────
  {
    id: "trendyol", name: "Trendyol", group: "Pazar Yeri",
    rootElement: "products", itemElement: "product",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "title", description: "description", brand: "brand", category: "categoryName", barcode: "barcode", stockCode: "stockCode", modelCode: "productMainId", price: "listPrice", stock: "quantity", currency: "currency", image: "imageUrl", images: "imageUrls", vatRate: "vatRate", dimensions: "dimensionalWeight", deliveryTime: "deliveryDuration", productUrl: "productUrl" },
    notes: "Trendyol API formatı"
  },
  {
    id: "hepsiburada", name: "Hepsiburada", group: "Pazar Yeri",
    rootElement: "Products", itemElement: "Product",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "ProductName", description: "Description", brand: "Brand", category: "CategoryName", barcode: "Barcode", stockCode: "MerchantSku", modelCode: "ModelCode", price: "Price", stock: "Stock", currency: "Currency", image: "Image1", images: "Images", weight: "Weight", vatRate: "VatRate", deliveryTime: "DeliveryTime", warranty: "Warranty", productUrl: "ProductUrl" },
  },
  {
    id: "n11", name: "N11", group: "Pazar Yeri",
    rootElement: "products", itemElement: "product",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "title", description: "description", brand: "brand", category: "category", barcode: "barcode", stockCode: "stockCode", price: "price", stock: "stock", currency: "currency", image: "image", images: "images", weight: "weight", vatRate: "vatRate", deliveryTime: "shippingDays", warranty: "warranty", productUrl: "productUrl" },
  },
  {
    id: "amazon", name: "Amazon TR", group: "Pazar Yeri",
    rootElement: "AmazonEnvelope", itemElement: "Message",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "title", description: "description", brand: "brand", category: "item_type", barcode: "barcode", stockCode: "sku", price: "price", stock: "quantity", currency: "currency", image: "main_image_url", weight: "weight", vatRate: "tax_code", productUrl: "external_product_url" },
  },
  {
    id: "pazarama", name: "Pazarama", group: "Pazar Yeri",
    rootElement: "Products", itemElement: "Product",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "Title", description: "Description", brand: "Brand", category: "CategoryName", barcode: "Barcode", stockCode: "MerchantSKU", price: "Price", stock: "Stock", currency: "Currency", image: "ImageUrl", weight: "Weight", vatRate: "VatRate", deliveryTime: "ShippingTime", warranty: "Warranty" },
  },
  {
    id: "ciceksepeti", name: "ÇiçekSepeti", group: "Pazar Yeri",
    rootElement: "products", itemElement: "product",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "name", description: "description", brand: "brand", category: "category", barcode: "barcode", stockCode: "stock_code", price: "price", stock: "stock", currency: "currency", image: "image", weight: "weight", vatRate: "vat_rate", deliveryTime: "delivery_time", warranty: "warranty" },
  },

  // ─────────────── FİYAT KARŞILAŞTIRMA ───────────────
  {
    id: "cimri", name: "Cimri", group: "Karşılaştırma",
    rootElement: "products", itemElement: "product",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "name", description: "description", brand: "brand", category: "category", barcode: "barcode", stockCode: "stock_code", price: "price", stock: "stock", currency: "currency", image: "image", images: "images", productUrl: "url", deliveryTime: "shipping_time", shippingCost: "shipping_cost" },
  },
  {
    id: "akakce", name: "Akakçe", group: "Karşılaştırma",
    rootElement: "products", itemElement: "product",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "name", description: "description", brand: "brand", category: "category", barcode: "barcode", stockCode: "stock_code", price: "price", stock: "stock", currency: "currency", image: "image", productUrl: "url", deliveryTime: "shipping_time", shippingCost: "shipping_cost" },
  },
  {
    id: "googleshopping", name: "Google Shopping", group: "Karşılaştırma",
    rootElement: "rss", itemElement: "channel",
    xmlHeader: '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    cdataFields: ["description"],
    fieldMap: { name: "g:title", description: "g:description", brand: "g:brand", category: "g:google_product_category", barcode: "g:gtin", stockCode: "g:sku", modelCode: "g:mpn", price: "g:price", stock: "g:availability", currency: "", image: "g:image_link", images: "g:additional_image_link", weight: "g:shipping_weight", vatRate: "g:tax", productUrl: "g:link", shippingCost: "g:shipping", status: "" },
    notes: "g:price=SATIS_FIYATI TRY formatı, g:availability=in_stock/out_of_stock"
  },
  {
    id: "facebook", name: "Facebook Catalog", group: "Sosyal",
    rootElement: "feed", itemElement: "product",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "title", description: "description", brand: "brand", category: "google_product_category", barcode: "gtin", stockCode: "sku", modelCode: "mpn", price: "price", stock: "availability", currency: "", image: "image_link", weight: "shipping_weight", productUrl: "link", status: "" },
  },

  // ─────────────── ÖZEL ───────────────
  {
    id: "custom_xml", name: "Özel XML", group: "Özel",
    rootElement: "products", itemElement: "product",
    xmlHeader: ENCODING,
    cdataFields: ["description"],
    fieldMap: { name: "name", description: "description", brand: "brand", category: "category", barcode: "barcode", stockCode: "sku", price: "price", stock: "stock", currency: "currency", image: "image", images: "images", weight: "weight", dimensions: "dimensions", vatRate: "vat", status: "status", deliveryTime: "delivery", productUrl: "url" },
    notes: "Alan eşleştirmeleri kullanıcı tarafından değiştirilebilir"
  },
  {
    id: "custom_csv", name: "Özel CSV", group: "Özel",
    rootElement: "", itemElement: "",
    cdataFields: [],
    fieldMap: { name: "name", barcode: "barcode", price: "price", stock: "stock" },
    notes: "CSV formatı, alan eşleştirme kullanıcı tanımlı"
  },
  {
    id: "bezos", name: "Bezos XML", group: "Entegrasyon",
    rootElement: "urunler", itemElement: "urun",
    xmlHeader: ENCODING,
    cdataFields: ["aciklama", "isim", "stok_kodu", "marka", "kategori_ismi", "kategori_tree", "barkod", "model", "urun_id"],
    fieldMap: {
      name: "isim", description: "aciklama", brand: "marka", category: "kategori_ismi", subcategory: "kategori_tree",
      externalId: "urun_id", barcode: "barkod", stockCode: "stok_kodu", modelCode: "model",
      price: "fiyat", costPrice: "alis_fiyat", stock: "stok", currency: "pb",
      image: "resim", images: "resimler", weight: "desi", vatRate: "kdv",
      warranty: "garanti", productUrl: "url", status: "durum",
    },
    notes: "Bezos BAYİ XML (B2BXML=1) — urunler/urun, OFFSET sayfalama destekli"
  },
  {
    id: "leyna", name: "Leyna XML", group: "Entegrasyon",
    rootElement: "products", itemElement: "product",
    variantElement: "variants", variantItemElement: "variant",
    xmlHeader: ENCODING,
    cdataFields: ["name","description","detail","brand","category","main_category","top_category","image1","image2","image3","image4"],
    fieldMap: { name: "name", description: "detail", brand: "brand", category: "top_category", subcategory: "main_category", barcode: "barcode", stockCode: "productCode", externalId: "id", modelCode: "specCode1", price: "sitePrice", costPrice: "listPrice", stock: "quantity", currency: "currency", image: "image1", images: "image1", weight: "desi", vatRate: "tax", deliveryTime: "", warranty: "", shippingCost: "", productUrl: "", status: "" },
    notes: "Leyna XML — sitePrice=site fiyatı, listPrice=liste fiyatı, name1/value1 varyant",
  },
  {
    id: "markentegra", name: "Markentegra XML", group: "Entegrasyon",
    rootElement: "products", itemElement: "product",
    xmlHeader: ENCODING,
    cdataFields: ["name", "detail", "category"],
    fieldMap: {
      name: "name", description: "detail", brand: "brand", category: "category",
      barcode: "barcode", stockCode: "productCode", externalId: "id",
      price: "price", costPrice: "listPrice", stock: "quantity", currency: "currency",
      image: "image1", images: "image1", weight: "desi", vatRate: "tax",
      productUrl: "url", status: "status",
    },
    notes: "markentegra.com/converts — products/product",
  },
  {
    id: "lisinya", name: "Lisinya XML", group: "Entegrasyon",
    rootElement: "products", itemElement: "product",
    xmlHeader: ENCODING,
    cdataFields: ["name", "description", "category", "categories"],
    fieldMap: {
      name: "name", description: "description", brand: "brand", category: "category",
      subcategory: "categories", barcode: "barkod", stockCode: "model",
      externalId: "product_id", price: "price", stock: "quantity", currency: "currency",
      image: "image", productUrl: "url", vatRate: "tax", status: "status",
    },
    notes: "lisinya.com storage/cache/feed",
  },
];

export function getTemplate(id: string): FeedTemplate | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByGroup(): Record<string, FeedTemplate[]> {
  const groups: Record<string, FeedTemplate[]> = {};
  for (const t of ALL_TEMPLATES) {
    if (!groups[t.group]) groups[t.group] = [];
    groups[t.group].push(t);
  }
  return groups;
}

export function getInputFormats(): FeedTemplate[] {
  return ALL_TEMPLATES.filter(t => t.id !== "custom_csv");
}
