/**
 * VHT tedarikçi feed tanımları — URL'ler yalnızca sunucu tarafında (env / storage JSON).
 * Frontend veya public bundle'a URL/token yazılmaz.
 */
import fs from "fs";
import path from "path";

export type VhtFeedDefinition = {
  code: string;
  name: string;
  supplier: string;
  inputFormat: string;
  fieldMapping?: Record<string, string>;
  variantMapping?: Record<string, string>;
  fixedValues?: Record<string, string>;
};

/** Metadata only — gerçek URL'ler env veya storage dosyasından yüklenir */
export const VHT_FEED_DEFINITIONS: VhtFeedDefinition[] = [
  { code: "VHT1", name: "Cercici", supplier: "cercici.com.tr", inputFormat: "leyna",
    fieldMapping: { price: "price", listPrice: "costPrice" } },
  { code: "VHT5", name: "Arias Closet", supplier: "ariasclosetx.com", inputFormat: "ticimax" },
  { code: "VHT7", name: "Leyna", supplier: "leyna.com.tr", inputFormat: "leyna" },
  { code: "VHT8", name: "Tahtadan Kale", supplier: "markentegra.com", inputFormat: "markentegra" },
  { code: "VHT9", name: "Easy Toptan", supplier: "easytoptan.com.tr", inputFormat: "projesoft" },
  { code: "VHT10", name: "Evvano", supplier: "markentegra.com", inputFormat: "markentegra" },
  { code: "VHT16", name: "Yeni Nesil Toptancı", supplier: "yeninesiltoptanci.com", inputFormat: "ticimax" },
  { code: "VHT17", name: "XML Tedarik", supplier: "xmltedarik.com", inputFormat: "leyna" },
  { code: "VHT18", name: "Beruflic", supplier: "beruflic.com", inputFormat: "leyna" },
  { code: "VHT21", name: "FTA Ticaret", supplier: "ftaticaret.com", inputFormat: "leyna" },
  { code: "VHT22", name: "Teknodayım", supplier: "teknodayim.com", inputFormat: "woo_feed" },
  { code: "VHT24", name: "Bijuteri.net", supplier: "bijuteri.net", inputFormat: "ticimax" },
  { code: "VHT25", name: "HepsiCDN", supplier: "hepsicdn.com.tr", inputFormat: "ticimax" },
  { code: "VHT28", name: "SHT Ticaret", supplier: "shticaret.com", inputFormat: "leyna" },
  { code: "VHT29A", name: "Markaon A", supplier: "markaon.com", inputFormat: "leyna" },
  { code: "VHT30", name: "E-Bijuteri", supplier: "ebijuteri.com", inputFormat: "ebijuteri" },
  { code: "VHT31A", name: "Markaon B", supplier: "markaon.com", inputFormat: "leyna" },
  { code: "VHT32A", name: "Markaon C", supplier: "markaon.com", inputFormat: "leyna" },
  { code: "VHT33A", name: "Markaon D", supplier: "markaon.com", inputFormat: "leyna" },
  { code: "VHT34", name: "Toptan Budur", supplier: "toptanbudur.com", inputFormat: "leyna" },
  { code: "VHT36", name: "Lisinya Genel", supplier: "lisinya.com", inputFormat: "lisinya" },
  { code: "VHT37", name: "Lisinya Kitap", supplier: "lisinya.com", inputFormat: "lisinya" },
  { code: "VHT40", name: "Kargolat", supplier: "kargolat.com", inputFormat: "leyna" },
  {
    code: "VHT41",
    name: "Go İthalat",
    supplier: "goithalat.com",
    inputFormat: "projesoft",
    fieldMapping: {
      urun_ad: "name",
      urun_aciklama: "description",
      urun_marka_ad: "brand",
      urun_kategori_path: "category",
      ozel_barkod_kodu: "barcode",
      ozel_urun_kodu: "stockCode",
      urun_fiyat_bayi_ozel: "price",
      urun_stok: "stock",
      urun_resim1: "image",
    },
    variantMapping: {},
  },
];

const ROOT = process.cwd();

function configPaths(): string[] {
  const fromEnv = process.env.VHT_SUPPLIER_FEEDS_PATH?.trim();
  const paths = [
    fromEnv,
    path.join(ROOT, "storage/thyronix/vht-supplier-feeds.json"),
    path.join(ROOT, "scripts/data/vht-supplier-feeds.json"),
  ].filter(Boolean) as string[];
  return paths;
}

export function loadVhtFeedUrlMap(): Record<string, string> {
  const map: Record<string, string> = {};

  for (const def of VHT_FEED_DEFINITIONS) {
    const envUrl = process.env[`VHT_FEED_${def.code}_URL`]?.trim();
    if (envUrl) map[def.code] = envUrl;
  }

  const jsonEnv = process.env.VHT_SUPPLIER_FEEDS_JSON?.trim();
  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv) as { feeds?: Array<{ code: string; url: string }> };
      for (const row of parsed.feeds || []) {
        if (row.code && row.url) map[row.code] = row.url;
      }
    } catch {
      /* ignore */
    }
  }

  for (const filePath of configPaths()) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
        feeds?: Array<{ code: string; url: string }>;
      };
      for (const row of raw.feeds || []) {
        if (row.code && row.url && !map[row.code]) map[row.code] = row.url;
      }
      break;
    } catch {
      /* try next path */
    }
  }

  return map;
}

export function getVhtFeedUrl(code: string): string | null {
  const map = loadVhtFeedUrlMap();
  return map[code] || null;
}

export function buildVhtSourcePayload(def: VhtFeedDefinition, xmlUrl: string) {
  const fixed: Record<string, string> = {
    currency: "TRY",
    _supplierCode: def.code,
    ...(def.fixedValues || {}),
  };
  return {
    name: `${def.code} — ${def.name}`,
    xmlUrl,
    type: "xml" as const,
    inputFormat: def.inputFormat,
    interval: 120,
    status: "active" as const,
    fieldMapping: def.fieldMapping ? JSON.stringify(def.fieldMapping) : null,
    variantMapping: def.variantMapping ? JSON.stringify(def.variantMapping) : null,
    fixedValues: JSON.stringify(fixed),
  };
}

export function listVhtFeedsWithUrls() {
  const urls = loadVhtFeedUrlMap();
  return VHT_FEED_DEFINITIONS.map((def) => ({
    ...def,
    url: urls[def.code] || null,
    hasUrl: Boolean(urls[def.code]),
  }));
}
