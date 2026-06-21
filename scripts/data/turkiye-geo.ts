/**
 * Türkiye GEO — tam veri (turkiye-geo-full.json) veya starter fallback
 * Güncellemek için: npm run fetch:turkiye-geo
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FULL_JSON_CANDIDATES = [
  path.join(__dirname, "turkiye-full-geo.json"),
  path.join(__dirname, "turkiye-geo-full.json"),
];

export type TurkiyeProvinceSeed = {
  plateCode: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  districts: Array<{ name: string; latitude: number | null; longitude: number | null }>;
};

function loadFullData(): TurkiyeProvinceSeed[] | null {
  for (const filePath of FULL_JSON_CANDIDATES) {
    if (!existsSync(filePath)) continue;
    try {
      const raw = JSON.parse(readFileSync(filePath, "utf8"));
      if (Array.isArray(raw?.provinces) && raw.provinces.length > 0) {
        return raw.provinces;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** Starter fallback — 81 il, her il için Merkez ilçe */
function buildStarterData(): TurkiyeProvinceSeed[] {
  const names = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
    "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
    "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
    "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
    "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
    "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
    "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
    "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce",
  ];
  return names.map((name, i) => ({
    plateCode: String(i + 1).padStart(2, "0"),
    name,
    latitude: null,
    longitude: null,
    districts: [{ name: `${name} Merkez`, latitude: null, longitude: null }],
  }));
}

const full = loadFullData();
export const TR_PROVINCES_FULL: TurkiyeProvinceSeed[] = full ?? buildStarterData();
export const GEO_DATA_SOURCE = full ? "full" : "starter";

export const TR_PROVINCES = TR_PROVINCES_FULL.map((p) => ({
  plateCode: p.plateCode,
  name: p.name,
}));

export const TR_DISTRICTS_BY_PLATE: Record<string, string[]> = Object.fromEntries(
  TR_PROVINCES_FULL.map((p) => [p.plateCode, p.districts.map((d) => d.name)])
);
