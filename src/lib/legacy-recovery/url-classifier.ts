import type { LegacyClassificationResult, LegacyUrlClassification } from "./types";
import { extractKeywordFromPath, normalizeLegacyUrl } from "./url-normalizer";

type PatternRule = {
  classification: LegacyUrlClassification;
  score: number;
  test: (path: string) => boolean;
  note: string;
};

const RULES: PatternRule[] = [
  {
    classification: "BLOG",
    score: 90,
    test: (p) => /^\/blog(\/|$)/i.test(p) || /^\/yazi(\/|$)/i.test(p) || /^\/makale(\/|$)/i.test(p),
    note: "Blog URL deseni",
  },
  {
    classification: "PRODUCT",
    score: 88,
    test: (p) =>
      /^\/(urun|product|products|p)(\/|$)/i.test(p) || /^\/shop\//i.test(p),
    note: "Ürün URL deseni",
  },
  {
    classification: "CATEGORY",
    score: 85,
    test: (p) => /^\/(kategori|category|categories)(\/|$)/i.test(p),
    note: "Kategori URL deseni",
  },
  {
    classification: "FAQ",
    score: 82,
    test: (p) => /^\/(faq|sss|sik-sorulan)(\/|$)/i.test(p),
    note: "SSS URL deseni",
  },
  {
    classification: "GEO",
    score: 80,
    test: (p) =>
      /^\/(sehir|il|bolge|geo|lokasyon)(\/|$)/i.test(p) ||
      /\/(istanbul|ankara|izmir|bursa|antalya)(\/|$)/i.test(p),
    note: "GEO / lokasyon URL deseni",
  },
  {
    classification: "LANDING",
    score: 75,
    test: (p) =>
      /^\/(kampanya|landing|lp|promo|firsat)(\/|$)/i.test(p) ||
      /20\d{2}/.test(p),
    note: "Landing / kampanya URL deseni",
  },
];

export function classifyLegacyUrl(rawUrl: string): LegacyClassificationResult {
  const path = normalizeLegacyUrl(rawUrl);
  const keyword = extractKeywordFromPath(path);

  for (const rule of RULES) {
    if (rule.test(path)) {
      return {
        classification: rule.classification,
        confidenceScore: rule.score,
        keyword,
        notes: rule.note,
      };
    }
  }

  return {
    classification: "UNKNOWN",
    confidenceScore: 40,
    keyword,
    notes: "Bilinmeyen URL yapısı",
  };
}
