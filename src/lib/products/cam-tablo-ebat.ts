/** Cam Tablo standart ebat listesi (doğru yazım) */
export const CAM_TABLO_EBAT_PRESET = [
  "Dikdörtgen 30 x 45",
  "Dikdörtgen 36 x 23",
  "Dikdörtgen 70 x 23",
  "Dikdörtgen 70 x 46",
  "Dikdörtgen 90 x 30",
  "Dikdörtgen 90 x 60",
  "Dikdörtgen 105 x 35",
  "Dikdörtgen 105 x 70",
  "Dikdörtgen 120 x 40",
  "Dikdörtgen 80 x 120",
  "Kare 30 x 30",
  "Kare 40 x 40",
  "Kare 50 x 50",
  "Kare 60 x 60",
  "Kare 100 x 100",
  "Yuvarlak 30 x 30",
  "Yuvarlak 40 x 40",
  "Yuvarlak 50 x 50",
  "Yuvarlak 60 x 60",
] as const;

const TYPO_REPLACEMENTS: [RegExp | string, string][] = [
  [/Dikdörtgeb/gi, "Dikdörtgen"],
  [/Dikdortgen/gi, "Dikdörtgen"],
  [/Yuvarlak\s+(\d+)\.x\s+(\d+)/gi, "Yuvarlak $1 x $2"],
  [/(\d+)\.x\s+(\d+)/g, "$1 x $2"],
  [/(\d+)\s*x\s*(\d+)/g, "$1 x $2"],
];

/** Bilinen yazım hatalarını düzeltir ve boyut formatını standartlaştırır */
export function normalizeVariantOptionValue(value: string): string {
  let v = value.trim();
  for (const [from, to] of TYPO_REPLACEMENTS) {
    v = typeof from === "string" ? v.split(from).join(to) : v.replace(from, to);
  }
  return v.replace(/\s+/g, " ").trim();
}

export function normalizeVariantOptions(options: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of options) {
    const n = normalizeVariantOptionValue(raw);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}
