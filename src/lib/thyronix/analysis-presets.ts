export type ThyronixAnalysisCategoryPreset = {
  value: string;
  label: string;
  commission: number;
};

export type ThyronixAnalysisMarketplacePreset = {
  value: string;
  label: string;
  categories: ThyronixAnalysisCategoryPreset[];
};

export type ThyronixAnalysisCargoPreset = {
  value: string;
  label: string;
  fee: number;
};

export const THYRONIX_MARKETPLACE_PRESETS: ThyronixAnalysisMarketplacePreset[] = [
  {
    value: "trendyol",
    label: "Trendyol",
    categories: [
      { value: "cam-tablo", label: "Cam Tablo", commission: 21.5 },
      { value: "mdf-tablo", label: "MDF Tablo", commission: 20.25 },
      { value: "dekor", label: "Dekorasyon", commission: 18.5 },
      { value: "genel", label: "Genel", commission: 17.0 },
    ],
  },
  {
    value: "hepsiburada",
    label: "Hepsiburada",
    categories: [
      { value: "cam-tablo", label: "Cam Tablo", commission: 20.0 },
      { value: "mdf-tablo", label: "MDF Tablo", commission: 19.5 },
      { value: "dekor", label: "Dekorasyon", commission: 17.5 },
      { value: "genel", label: "Genel", commission: 16.0 },
    ],
  },
  {
    value: "n11",
    label: "N11",
    categories: [
      { value: "cam-tablo", label: "Cam Tablo", commission: 19.0 },
      { value: "mdf-tablo", label: "MDF Tablo", commission: 18.0 },
      { value: "dekor", label: "Dekorasyon", commission: 16.5 },
      { value: "genel", label: "Genel", commission: 15.0 },
    ],
  },
];

export const THYRONIX_CARGO_PRESETS: ThyronixAnalysisCargoPreset[] = [
  { value: "yurtici", label: "Yurtiçi Kargo", fee: 89 },
  { value: "aras", label: "Aras Kargo", fee: 82 },
  { value: "mng", label: "MNG Kargo", fee: 86 },
  { value: "surat", label: "Sürat Kargo", fee: 76 },
  { value: "self", label: "Kendi Anlaşmam", fee: 65 },
];

export function findMarketplacePreset(value: string) {
  return THYRONIX_MARKETPLACE_PRESETS.find((item) => item.value === value) || THYRONIX_MARKETPLACE_PRESETS[0];
}
