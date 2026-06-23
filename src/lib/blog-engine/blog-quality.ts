import type { BlogContentPayload, BlogFaqItem, BlogQualityResult } from "./blog-types";

export function runBlogQualityCheck(opts: {
  content: BlogContentPayload;
  faq: BlogFaqItem[];
  seoTitle: string;
  seoDescription: string;
  province?: string | null;
  originalityHint?: number;
}): BlogQualityResult {
  const checks = [
    { id: "h1", label: "H1 başlık", passed: !!opts.content.h1?.trim() },
    { id: "intro", label: "Giriş paragrafı", passed: !!opts.content.intro?.trim() },
    {
      id: "sections",
      label: "En az 5 bölüm",
      passed: (opts.content.sections?.length || 0) >= 5,
    },
    { id: "faq", label: "FAQ bloğu", passed: opts.faq.length >= 3 },
    { id: "seo_title", label: "Meta title", passed: !!opts.seoTitle?.trim() },
    { id: "seo_desc", label: "Meta description", passed: !!opts.seoDescription?.trim() },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const seoScore = Math.min(
    100,
    (opts.seoTitle.length >= 30 ? 30 : opts.seoTitle.length) +
      (opts.seoDescription.length >= 80 ? 40 : opts.seoDescription.length / 2) +
      (opts.content.h1 ? 30 : 0)
  );
  const geoScore = opts.province ? Math.min(100, 60 + (opts.content.sections.length >= 5 ? 40 : 20)) : 40;
  const originalityScore = Math.min(100, opts.originalityHint ?? 85);
  const qualityScore = Math.round(
    passedCount * 12 + seoScore * 0.2 + geoScore * 0.1 + originalityScore * 0.2
  );

  const warnings: string[] = [];
  if (!checks.find((c) => c.id === "sections")?.passed) {
    warnings.push("En az 5 bölüm gerekli");
  }
  if (!checks.find((c) => c.id === "faq")?.passed) {
    warnings.push("FAQ en az 3 soru içermeli");
  }

  return {
    passed: checks.every((c) => c.passed),
    originalityScore,
    seoScore: Math.round(seoScore),
    geoScore: Math.round(geoScore),
    qualityScore: Math.min(100, qualityScore),
    checks,
    warnings,
  };
}
