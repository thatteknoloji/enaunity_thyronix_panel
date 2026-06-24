import { readFileSync, existsSync } from "fs";
import path from "path";

export type TurkiyeIlIlceKayit = {
  province: string;
  districts: string[];
};

const FALLBACK_KAYNAK: TurkiyeIlIlceKayit[] = [
  {
    province: "İstanbul",
    districts: ["Kadıköy", "Beşiktaş", "Üsküdar", "Fatih", "Bakırköy"],
  },
  {
    province: "Ankara",
    districts: ["Çankaya", "Keçiören", "Yenimahalle", "Mamak", "Etimesgut"],
  },
  {
    province: "İzmir",
    districts: ["Konak", "Karşıyaka", "Bornova", "Buca", "Bayraklı"],
  },
];

let cachedKaynak: TurkiyeIlIlceKayit[] | null = null;

function loadFromJson(): TurkiyeIlIlceKayit[] | null {
  const candidates = [
    path.join(process.cwd(), "scripts/data/turkiye-geo-full.json"),
    path.join(process.cwd(), "scripts/data/turkiye-full-geo.json"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const raw = JSON.parse(readFileSync(file, "utf8"));
      if (!Array.isArray(raw?.provinces) || raw.provinces.length === 0) continue;
      return raw.provinces.map((p: { name: string; districts: Array<{ name: string }> }) => ({
        province: p.name,
        districts: p.districts.map((d) => d.name),
      }));
    } catch {
      continue;
    }
  }
  return null;
}

/** 81 il + ilçe listesi — tam veri scripts/data/turkiye-geo-full.json'dan yüklenir */
export function getTurkiyeIlIlceKaynagi(): TurkiyeIlIlceKayit[] {
  if (cachedKaynak) return cachedKaynak;
  cachedKaynak = loadFromJson() ?? FALLBACK_KAYNAK;
  return cachedKaynak;
}

/** Statik erişim — lazy yükleme */
export const TURKIYE_IL_ILCE_KAYNAGI: TurkiyeIlIlceKayit[] = new Proxy([] as TurkiyeIlIlceKayit[], {
  get(_target, prop, receiver) {
    const data = getTurkiyeIlIlceKaynagi();
    return Reflect.get(data, prop, receiver);
  },
});

export function getAllProvinceNames(): string[] {
  return getTurkiyeIlIlceKaynagi().map((p) => p.province);
}

export function getDistrictsForProvince(province: string): string[] {
  const normalized = province.trim().toLocaleLowerCase("tr-TR");
  const row = getTurkiyeIlIlceKaynagi().find(
    (p) => p.province.toLocaleLowerCase("tr-TR") === normalized
  );
  return row?.districts ?? [];
}

export function getTotalProvinceCount(): number {
  return getTurkiyeIlIlceKaynagi().length;
}

export function getTotalDistrictCount(): number {
  return getTurkiyeIlIlceKaynagi().reduce((sum, p) => sum + p.districts.length, 0);
}

export function findProvinceRecord(province: string): TurkiyeIlIlceKayit | undefined {
  const normalized = province.trim().toLocaleLowerCase("tr-TR");
  return getTurkiyeIlIlceKaynagi().find((p) => p.province.toLocaleLowerCase("tr-TR") === normalized);
}
