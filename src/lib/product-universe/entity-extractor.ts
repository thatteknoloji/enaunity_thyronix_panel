import type { ProductEntityType } from "@prisma/client";

export type ExtractedEntity = {
  type: ProductEntityType;
  value: string;
  confidence: number;
};

export type ExtractedAttribute = {
  key: string;
  value: string;
  unit?: string;
  confidence: number;
};

const MATERIAL_PATTERNS: Array<{ pattern: RegExp; value: string; confidence: number }> = [
  { pattern: /temperli\s*cam/i, value: "temperli cam", confidence: 0.95 },
  { pattern: /\bcam\s*tablo\b|\bcam\b/i, value: "cam", confidence: 0.85 },
  { pattern: /\bmdf\b/i, value: "mdf", confidence: 0.9 },
  { pattern: /\bkanvas\b/i, value: "kanvas", confidence: 0.9 },
  { pattern: /\bposter\b/i, value: "poster", confidence: 0.9 },
];

const SIZE_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\b30\s*[x×]\s*45\b/i, value: "30x45" },
  { pattern: /\b50\s*[x×]\s*70\b/i, value: "50x70" },
  { pattern: /\b70\s*[x×]\s*100\b/i, value: "70x100" },
  { pattern: /\b100\s*[x×]\s*100\b/i, value: "100x100" },
  { pattern: /\b90\s*[x×]\s*60\b/i, value: "90x60" },
  { pattern: /\b(\d{2,3})\s*[x×]\s*(\d{2,3})\b/i, value: "" },
];

const THEME_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /atatürk|mustafa\s*kemal/i, value: "Atatürk" },
  { pattern: /manzara|doğa|doga|landscape/i, value: "manzara" },
  { pattern: /soyut|abstract/i, value: "soyut" },
  { pattern: /dini|islam|kuran|ayet/i, value: "dini" },
  { pattern: /osmanlı|osmanli|ottoman/i, value: "Osmanlı" },
  { pattern: /hayvan|animal|kedi|köpek/i, value: "hayvan" },
  { pattern: /şehir|sehir|city|istanbul|ankara/i, value: "şehir" },
  { pattern: /çiçek|cicek|flower|floral/i, value: "çiçek" },
];

const USAGE_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /salon/i, value: "salon" },
  { pattern: /ofis|office/i, value: "ofis" },
  { pattern: /yatak\s*odası|yatak\s*odasi|bedroom/i, value: "yatak odası" },
  { pattern: /mutfak|kitchen/i, value: "mutfak" },
  { pattern: /çocuk\s*odası|cocuk\s*odasi|kids/i, value: "çocuk odası" },
];

const STYLE_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /modern/i, value: "modern" },
  { pattern: /klasik|classic/i, value: "klasik" },
  { pattern: /minimal|minimalist/i, value: "minimal" },
  { pattern: /lüks|luks|luxury/i, value: "lüks" },
  { pattern: /dekoratif|decorative/i, value: "dekoratif" },
];

function extractFromText(text: string): { entities: ExtractedEntity[]; attributes: ExtractedAttribute[] } {
  const entities: ExtractedEntity[] = [];
  const attributes: ExtractedAttribute[] = [];
  const seen = new Set<string>();

  const addEntity = (type: ProductEntityType, value: string, confidence: number) => {
    const key = `${type}:${value.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    entities.push({ type, value, confidence });
  };

  for (const m of MATERIAL_PATTERNS) {
    if (m.pattern.test(text)) {
      addEntity("MATERIAL", m.value, m.confidence);
      attributes.push({ key: "material", value: m.value, confidence: m.confidence });
    }
  }

  for (const s of SIZE_PATTERNS) {
    const match = text.match(s.pattern);
    if (match) {
      const value = s.value || `${match[1]}x${match[2]}`;
      addEntity("SIZE", value, 0.9);
      attributes.push({ key: "size", value, unit: "cm", confidence: 0.9 });
    }
  }

  for (const t of THEME_PATTERNS) {
    if (t.pattern.test(text)) addEntity("THEME", t.value, 0.85);
  }

  for (const u of USAGE_PATTERNS) {
    if (u.pattern.test(text)) addEntity("USAGE_AREA", u.value, 0.8);
  }

  for (const st of STYLE_PATTERNS) {
    if (st.pattern.test(text)) addEntity("STYLE", st.value, 0.8);
  }

  const brandMatch = text.match(/\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)?)\s+tablo/i);
  if (brandMatch) addEntity("BRAND", brandMatch[1], 0.6);

  if (/\btablo\b/i.test(text)) addEntity("CATEGORY", "tablo", 0.75);
  if (/\bduvar\s*dekor/i.test(text)) addEntity("CATEGORY", "duvar dekorasyonu", 0.7);

  return { entities, attributes };
}

export function extractProductEntities(input: {
  rawName: string;
  normalizedName: string;
  descriptionClean?: string;
  categoryPath?: string;
  brand?: string;
}): { entities: ExtractedEntity[]; attributes: ExtractedAttribute[] } {
  const text = [input.normalizedName, input.descriptionClean, input.categoryPath, input.brand]
    .filter(Boolean)
    .join(" ");

  const result = extractFromText(text);

  if (input.brand?.trim()) {
    const key = `BRAND:${input.brand.toLowerCase()}`;
    if (!result.entities.some((e) => `${e.type}:${e.value.toLowerCase()}` === key)) {
      result.entities.push({ type: "BRAND", value: input.brand.trim(), confidence: 0.95 });
    }
  }

  if (input.categoryPath?.trim()) {
    const parts = input.categoryPath.split(/[>/|]/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      result.entities.push({ type: "CATEGORY", value: part, confidence: 0.7 });
    }
  }

  return result;
}
