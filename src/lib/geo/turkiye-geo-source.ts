import { prisma } from "@/lib/db";

/** Blog / GEO fallback — DB yoksa veya boşsa kullanılır (10 il) */
export const TURKIYE_GEO_FALLBACK_PROVINCES = [
  "İstanbul",
  "Ankara",
  "İzmir",
  "Bursa",
  "Antalya",
  "Konya",
  "Adana",
  "Gaziantep",
  "Kocaeli",
  "Mersin",
] as const;

/** TOP_20 benzeri öncelikli iller — DB fallback için */
const TOP_PROVINCE_NAMES = [
  "İstanbul",
  "Ankara",
  "İzmir",
  "Bursa",
  "Antalya",
  "Konya",
  "Adana",
  "Mersin",
  "Samsun",
  "Kayseri",
  "Gaziantep",
  "Eskişehir",
  "Kocaeli",
  "Sakarya",
  "Denizli",
  "Muğla",
  "Aydın",
  "Balıkesir",
  "Tekirdağ",
  "Trabzon",
] as const;

const PROVINCE_ALIASES: Record<string, string> = {
  istanbul: "İstanbul",
  izmir: "İzmir",
  ankara: "Ankara",
  mugla: "Muğla",
  eskisehir: "Eskişehir",
  afyon: "Afyonkarahisar",
};

/** İl adını karşılaştırma / eşleştirme için normalize eder */
export function normalizeProvinceName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLocaleLowerCase("tr-TR");
  if (PROVINCE_ALIASES[lower]) return PROVINCE_ALIASES[lower];
  return trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR"))
    .join(" ");
}

/** Blog Engine GEO modu — ilk etapta aktif 10 il */
export function getBlogGeoProvinces(): string[] {
  return [...TURKIYE_GEO_FALLBACK_PROVINCES];
}

/** Varsayılan il listesi (senkron fallback) */
export function getDefaultGeoCities(limit = 10): string[] {
  const n = Math.max(1, limit);
  return [...TURKIYE_GEO_FALLBACK_PROVINCES].slice(0, n);
}

/** Öncelikli büyük iller (senkron fallback) */
export function getTopGeoCities(limit = 20): string[] {
  const n = Math.max(1, limit);
  return [...TOP_PROVINCE_NAMES].slice(0, n);
}

/** DB'den aktif illeri çeker; boşsa fallback döner */
export async function getGeoCitiesFromDbOrFallback(limit?: number): Promise<string[]> {
  const take = limit && limit > 0 ? limit : 81;
  try {
    const rows = await prisma.geoProvince.findMany({
      where: { isActive: true, country: { code: "TR" } },
      orderBy: { plateCode: "asc" },
      take,
      select: { name: true },
    });
    if (rows.length > 0) {
      return rows.map((r) => normalizeProvinceName(r.name));
    }
  } catch {
    // DB yok / migration eksik — fallback
  }
  return take <= 10 ? getDefaultGeoCities(take) : getTopGeoCities(Math.min(take, 20));
}
