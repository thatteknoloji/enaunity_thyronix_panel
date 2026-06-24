import { capitalizeKeyword } from "./plan-utils";

export function buildSupportBlogTitles(keyword: string): string[] {
  const k = capitalizeKeyword(keyword);
  return [
    `${k} Nasıl Alınır`,
    `${k} Şartları`,
    `${k} Karlı mı`,
    `${k} Başvuru Rehberi`,
  ];
}

export function buildFaqTitles(keyword: string): string[] {
  const k = capitalizeKeyword(keyword);
  return [
    `${k} Kaç TL`,
    `${k} İçin Şirket Kurmak Gerekir mi`,
    `${k} Süreci Ne Kadar Sürer`,
  ];
}

export function buildCategoryTitles(keyword: string, category?: string | null): string[] {
  if (category) return [category];
  const k = capitalizeKeyword(keyword);
  return [`${k} Kategorisi`, `Ev Dekorasyonu Bayilikleri`, `Baskı Ürünleri Bayilikleri`];
}

export const TOP_GEO_PROVINCES = [
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

export function buildGeoProvinceTitles(keyword: string, provinces: string[]): string[] {
  const k = capitalizeKeyword(keyword);
  return provinces.map((p) => `${p} ${k}`);
}
