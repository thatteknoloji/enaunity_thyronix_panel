import type { ImportType, ImportRow } from "./import-service";

/** CSV/JSON/XLSX satırlarını standart kolon isimlerine normalize eder */
export function normalizeImportRows(type: ImportType, rows: ImportRow[]): ImportRow[] {
  return rows.map((row) => normalizeImportRow(type, row));
}

function lowerKeys(row: ImportRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim().toLowerCase()] = v;
  }
  return out;
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}

export function normalizeImportRow(type: ImportType, row: ImportRow): ImportRow {
  const src = lowerKeys(row);
  const base: ImportRow = {
    country: str(src.country || src.ulke || src.countrycode || "TR"),
    latitude: (src.latitude ?? src.lat) as string | number | null | undefined,
    longitude: (src.longitude ?? src.lng ?? src.lon) as string | number | null | undefined,
    type: str(src.type),
  };

  switch (type) {
    case "province":
      return {
        ...base,
        province: str(src.province || src.provincename || src.il || src.il_adi || src.name),
        provinceCode: str(src.provincecode || src.platecode || src.plate_code || src.plaka || src.il_kodu),
      };
    case "district":
      return {
        ...base,
        province: str(src.province || src.provincename || src.il || src.il_adi),
        provinceCode: str(src.provincecode || src.platecode || src.plaka),
        district: str(src.district || src.districtname || src.ilce || src.ilce_adi || src.name),
        districtCode: str(src.districtcode || src.ilce_kodu),
      };
    case "neighborhood":
      return {
        ...base,
        province: str(src.province || src.il),
        district: str(src.district || src.ilce),
        neighborhood: str(src.neighborhood || src.neighborhoodname || src.mahalle || src.mahalle_adi || src.name),
      };
    case "village":
      return {
        ...base,
        province: str(src.province || src.il),
        district: str(src.district || src.ilce),
        village: str(src.village || src.koy || src.koy_adi || src.name),
      };
    case "street":
      return {
        ...base,
        province: str(src.province || src.il),
        district: str(src.district || src.ilce),
        neighborhood: str(src.neighborhood || src.mahalle),
        street: str(src.street || src.sokak || src.cadde || src.streetname || src.name),
      };
    default:
      return base;
  }
}
