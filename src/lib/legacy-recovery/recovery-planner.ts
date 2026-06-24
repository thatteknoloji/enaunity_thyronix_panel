import type {
  LegacyClassificationResult,
  LegacyRecoveryPlan,
  LegacyUrlRecoveryStrategy,
} from "./types";
import { normalizeLegacyUrl, slugToReadableTitle, extractPathSlug } from "./url-normalizer";

const GONE_PATTERNS = [
  /\/kampanya-20\d{2}/i,
  /\/firsat-20\d{2}/i,
  /\/deprecated/i,
  /\/silindi/i,
];

const REDIRECT_PATTERNS = [
  /^\/urun\//i,
  /^\/product\//i,
  /^\/products\//i,
];

export function planLegacyRecovery(
  rawUrl: string,
  classification: LegacyClassificationResult
): LegacyRecoveryPlan {
  const path = normalizeLegacyUrl(rawUrl);
  const slug = extractPathSlug(path);

  if (GONE_PATTERNS.some((r) => r.test(path))) {
    return {
      strategy: "GONE_410",
      confidenceScore: 85,
      suggestedTargetUrl: null,
      notes: "Eski kampanya / süresi dolmuş içerik",
    };
  }

  switch (classification.classification) {
    case "BLOG":
      return {
        strategy: "CREATE_BLOG",
        confidenceScore: classification.confidenceScore,
        suggestedTargetUrl: `/blog/${slug}`,
        notes: "Blog Engine ile özgün içerik üret",
      };
    case "LANDING":
    case "FAQ":
      return {
        strategy: "CREATE_PAGE",
        confidenceScore: classification.confidenceScore - 5,
        suggestedTargetUrl: `/p/${slug}`,
        notes: "Page Factory landing sayfası üret",
      };
    case "PRODUCT":
      if (REDIRECT_PATTERNS.some((r) => r.test(path)) || /eski/i.test(slug)) {
        const target = `/products/${slug.replace(/^eski-/, "")}`;
        return {
          strategy: "REDIRECT_301",
          confidenceScore: 80,
          suggestedTargetUrl: target,
          notes: "Güncel ürün sayfasına yönlendir",
        };
      }
      return {
        strategy: "REDIRECT_301",
        confidenceScore: 70,
        suggestedTargetUrl: `/products/${slug}`,
        notes: "Ürün sayfasına yönlendir",
      };
    case "CATEGORY":
      return {
        strategy: "REDIRECT_301",
        confidenceScore: 75,
        suggestedTargetUrl: `/blog/category/${slug}`,
        notes: "Kategori hub'a yönlendir",
      };
    case "GEO":
      return {
        strategy: "CREATE_BLOG",
        confidenceScore: classification.confidenceScore,
        suggestedTargetUrl: `/blog/geo/${slug}`,
        notes: "GEO blog içeriği üret",
      };
    default:
      if (slug.length < 3) {
        return {
          strategy: "IGNORE",
          confidenceScore: 30,
          suggestedTargetUrl: null,
          notes: "Çok kısa slug — göz ardı",
        };
      }
      return {
        strategy: "CREATE_PAGE",
        confidenceScore: 50,
        suggestedTargetUrl: `/p/${slug}`,
        notes: `Bilinmeyen URL — landing: ${slugToReadableTitle(slug)}`,
      };
  }
}

export function strategyLabel(strategy: LegacyUrlRecoveryStrategy): string {
  const labels: Record<LegacyUrlRecoveryStrategy, string> = {
    CREATE_BLOG: "Blog Üret",
    CREATE_PAGE: "Sayfa Üret",
    REDIRECT_301: "301 Yönlendir",
    GONE_410: "410 Gone",
    IGNORE: "Göz Ardı",
  };
  return labels[strategy];
}
