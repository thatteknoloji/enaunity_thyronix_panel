import { DEFAULT_THYRONIX_SYNC_INTERVAL } from "../sync-interval";
import { getTemplate } from "../templates";

/** Bezos BAYİ XML — bayi feed URL'leri ve alan eşleştirme dokümantasyonu */
export const BEZOS_BAYI_XML = {
  id: "bezos-bayi-xml",
  name: "Bezos BAYİ XML",
  supplier: "bezos.com.tr",
  inputFormat: "bezos" as const,
  /** Birincil feed — OFFSET=0 (ilk 50.000 ürün). BAYi = ASCII i (BAYİ 404 verir) */
  primaryUrl: "https://www.bezos.com.tr/xml-bayi/?xml=BAYi%20XML&B2BXML=1",
  /** Sayfalı feed — OFFSET=50000 (50.001+ ürünler) */
  feedUrls: [
    "https://www.bezos.com.tr/xml-bayi/?xml=BAYi%20XML&B2BXML=1",
    "https://www.bezos.com.tr/xml-bayi/?xml=BAYi%20XML&B2BXML=1&OFFSET=50000",
  ],
  pagination: {
    type: "offset" as const,
    param: "OFFSET",
    pageSize: 50000,
  },
  fixedValues: {
    currency: "TRY",
    _feedUrls: [
      "https://www.bezos.com.tr/xml-bayi/?xml=BAYi%20XML&B2BXML=1",
      "https://www.bezos.com.tr/xml-bayi/?xml=BAYi%20XML&B2BXML=1&OFFSET=50000",
    ],
    _autoOffset: "true",
    _offsetPageSize: "50000",
  },
  /** Özel alan override yok — şablon varsayılanları %100 Bezos BAYİ XML ile uyumlu */
  fieldMapping: {} as Record<string, string>,
  variantMapping: {} as Record<string, string>,
};

export type ConnectorMappingRow = {
  xmlField: string;
  thyronixField: string;
  label: string;
  type: "text" | "number" | "url" | "status" | "currency";
  required: boolean;
  example: string;
  notes?: string;
};

/** Kayıtlı eşleştirme tablosu — admin/bayi ekranında gösterilir */
export const BEZOS_BAYI_MAPPING_DOC: ConnectorMappingRow[] = [
  { xmlField: "urun_id", thyronixField: "externalId", label: "Ürün ID", type: "text", required: true, example: "100001", notes: "Benzersiz kayıt anahtarı (barkod yoksa)" },
  { xmlField: "isim", thyronixField: "name", label: "Ürün Adı", type: "text", required: true, example: "Örnek Cam Tablo 60x90" },
  { xmlField: "aciklama", thyronixField: "description", label: "Açıklama", type: "text", required: false, example: "Modern tasarım cam tablo…" },
  { xmlField: "marka", thyronixField: "brand", label: "Marka", type: "text", required: false, example: "BEZOS HOME" },
  { xmlField: "kategori_ismi", thyronixField: "category", label: "Kategori", type: "text", required: false, example: "Cam Tablo" },
  { xmlField: "kategori_tree", thyronixField: "subcategory", label: "Kategori Ağacı", type: "text", required: false, example: "Dekorasyon > Cam Tablo > Modern" },
  { xmlField: "barkod", thyronixField: "barcode", label: "Barkod (EAN/GTIN)", type: "text", required: true, example: "8681234567890" },
  { xmlField: "stok_kodu", thyronixField: "stockCode", label: "Stok Kodu", type: "text", required: true, example: "CT-6090-MOD" },
  { xmlField: "model", thyronixField: "modelCode", label: "Model", type: "text", required: false, example: "CT6090" },
  { xmlField: "fiyat", thyronixField: "price", label: "Satış Fiyatı", type: "number", required: true, example: "1299.90", notes: "Bayi satış fiyatı (KDV dahil/hariç tedarikçi ayarına göre)" },
  { xmlField: "alis_fiyat", thyronixField: "costPrice", label: "Alış Fiyatı", type: "number", required: false, example: "899.00", notes: "Bayi maliyet fiyatı" },
  { xmlField: "stok", thyronixField: "stock", label: "Stok Adedi", type: "number", required: true, example: "42" },
  { xmlField: "pb", thyronixField: "currency", label: "Para Birimi", type: "currency", required: false, example: "TRY / TL" },
  { xmlField: "resim", thyronixField: "image", label: "Ana Görsel", type: "url", required: false, example: "https://…/main.jpg" },
  { xmlField: "resimler > resim", thyronixField: "images", label: "Tüm Görseller", type: "url", required: false, example: "url1,url2", notes: "Virgülle birleştirilir" },
  { xmlField: "desi", thyronixField: "weight", label: "Desi / Ağırlık", type: "number", required: false, example: "3" },
  { xmlField: "kdv", thyronixField: "vatRate", label: "KDV Oranı", type: "number", required: false, example: "20" },
  { xmlField: "garanti", thyronixField: "warranty", label: "Garanti", type: "text", required: false, example: "24 Ay" },
  { xmlField: "url", thyronixField: "productUrl", label: "Ürün Linki", type: "url", required: false, example: "https://bezos.com.tr/urun/…" },
  { xmlField: "durum", thyronixField: "status", label: "Durum", type: "status", required: false, example: "1 / 0", notes: "1=Aktif, 0=Pasif" },
];

export function getBezosTemplate(): FeedTemplate | undefined {
  return getTemplate("bezos");
}

export function buildBezosSourcePayload(dealerName?: string) {
  const label = dealerName ? `Bezos BAYİ XML — ${dealerName}` : "Bezos BAYİ XML";
  return {
    name: label,
    xmlUrl: BEZOS_BAYI_XML.primaryUrl,
    type: "xml",
    inputFormat: BEZOS_BAYI_XML.inputFormat,
    interval: DEFAULT_THYRONIX_SYNC_INTERVAL,
    status: "active",
    fieldMapping: JSON.stringify(BEZOS_BAYI_XML.fieldMapping),
    variantMapping: JSON.stringify(BEZOS_BAYI_XML.variantMapping),
    fixedValues: JSON.stringify({
      ...BEZOS_BAYI_XML.fixedValues,
      _supplierCode: "VHT38",
    }),
  };
}

export function resolveFeedUrlsFromSource(source: {
  xmlUrl: string;
  fixedValues?: string | null;
}): string[] {
  try {
    const fixed = JSON.parse(source.fixedValues || "{}") as Record<string, unknown>;
    const extra = fixed._feedUrls;
    if (Array.isArray(extra) && extra.length > 0) {
      return [...new Set(extra.map(String).filter(Boolean))];
    }
  } catch {
    /* ignore */
  }
  return source.xmlUrl ? [source.xmlUrl] : [];
}
