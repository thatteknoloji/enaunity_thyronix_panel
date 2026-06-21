import type { GeoLayer, GeoNode } from "./types";
import { GEO_LAYERS } from "./types";

/** Türkiye coğrafi katman istatistikleri — resmi veri kaynağı ileride bağlanacak */
export const TURKEY_GEO_STATS = {
  il: 81,
  ilce: 973,
  mahalle: 18_000,
  koy: 18_500,
  semt: 4_200,
} as const;

const SAMPLE_ILS = [
  "İstanbul",
  "Ankara",
  "İzmir",
  "Bursa",
  "Antalya",
  "Adana",
  "Konya",
  "Gaziantep",
  "Kadıköy",
  "Beşiktaş",
];

export function getGeoStatsForCountry(country: string) {
  if (country.toUpperCase() === "TR" || country.toLowerCase() === "türkiye") {
    return { ...TURKEY_GEO_STATS, country: "TR", layers: [...GEO_LAYERS] };
  }
  return {
    il: 1,
    ilce: 5,
    mahalle: 20,
    koy: 10,
    semt: 8,
    country,
    layers: ["region", "city", "district"] as string[],
  };
}

/** GEO ağacı — şimdilik temsili düğümler, mimari gerçek veri kaynağına hazır */
export function buildGeoTree(country: string): { nodes: GeoNode[]; layers: string[]; stats: typeof TURKEY_GEO_STATS | Record<string, number> } {
  const stats = getGeoStatsForCountry(country);
  const layers = stats.layers as string[];
  const nodes: GeoNode[] = [];

  if (country.toUpperCase() === "TR") {
    SAMPLE_ILS.slice(0, 5).forEach((il, i) => {
      const ilId = `il-${i}`;
      nodes.push({ id: ilId, layer: "il", name: il, childCount: Math.round(TURKEY_GEO_STATS.ilce / TURKEY_GEO_STATS.il) });
      if (il === "İstanbul") {
        ["Kadıköy", "Beşiktaş", "Üsküdar"].forEach((ilce, j) => {
          const ilceId = `ilce-${i}-${j}`;
          nodes.push({ id: ilceId, layer: "ilce", name: ilce, parentId: ilId, childCount: 12 });
          ["Moda", "Fenerbahçe", "Göztepe"].slice(0, 2).forEach((mahalle, k) => {
            nodes.push({
              id: `mahalle-${i}-${j}-${k}`,
              layer: "mahalle",
              name: mahalle,
              parentId: ilceId,
            });
          });
        });
      }
    });
    return { nodes, layers, stats: TURKEY_GEO_STATS };
  }

  nodes.push({ id: "root-region", layer: "il", name: country, childCount: 3 });
  const genericStats = { il: stats.il, ilce: stats.ilce, mahalle: stats.mahalle, koy: stats.koy, semt: stats.semt };
  return { nodes, layers, stats: genericStats };
}

export function countGeoNodes(country: string): number {
  const stats = getGeoStatsForCountry(country);
  if (country.toUpperCase() === "TR") {
    return TURKEY_GEO_STATS.il + TURKEY_GEO_STATS.ilce + TURKEY_GEO_STATS.mahalle + TURKEY_GEO_STATS.koy + TURKEY_GEO_STATS.semt;
  }
  return Object.values(stats).reduce<number>((sum, v) => (typeof v === "number" ? sum + v : sum), 0);
}
