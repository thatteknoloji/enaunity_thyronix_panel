import type { BlogContentPayload, BlogFaqItem, BlogQualityResult } from "./blog-types";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function keywordInText(keyword: string, ...texts: string[]): boolean {
  if (!keyword.trim()) return true;
  const kw = keyword.toLocaleLowerCase("tr-TR");
  return texts.some((t) => t.toLocaleLowerCase("tr-TR").includes(kw));
}

export function runBlogQualityCheck(opts: {
  content: BlogContentPayload;
  faq: BlogFaqItem[];
  seoTitle: string;
  seoDescription: string;
  schema?: Record<string, unknown> | null;
  keyword?: string;
  province?: string | null;
  originalityHint?: number;
}): BlogQualityResult {
  const contentText = [
    opts.content.h1,
    opts.content.intro,
    ...opts.content.sections.map((s) => `${s.heading} ${s.body}`),
    opts.content.conclusion,
  ].join(" ");

  const hasSchema =
    !!opts.schema &&
    (("@graph" in opts.schema && Array.isArray(opts.schema["@graph"])) ||
      opts.schema["@type"] === "BlogPosting" ||
      opts.schema["@type"] === "FAQPage");

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
    { id: "schema", label: "JSON-LD schema", passed: hasSchema },
    {
      id: "content_length",
      label: "Yeterli içerik uzunluğu",
      passed: countWords(contentText) >= 80,
    },
    {
      id: "heading_structure",
      label: "Başlık yapısı",
      passed: opts.content.sections.every((s) => !!s.heading?.trim() && !!s.body?.trim()),
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const keyword = opts.keyword || "";

  const keywordPlacementScore = keyword
    ? [
        keywordInText(keyword, opts.content.h1),
        keywordInText(keyword, opts.content.intro),
        keywordInText(keyword, opts.seoTitle),
        keywordInText(keyword, opts.seoDescription),
        opts.content.sections.some((s) => keywordInText(keyword, s.heading, s.body)),
      ].filter(Boolean).length * 12
    : 40;

  const seoScore = Math.min(
    100,
    Math.round(
      (opts.seoTitle.length >= 30 ? 25 : opts.seoTitle.length * 0.8) +
        (opts.seoDescription.length >= 80 ? 35 : opts.seoDescription.length * 0.4) +
        (opts.content.h1 ? 20 : 0) +
        keywordPlacementScore * 0.2
    )
  );

  const geoRelevance =
    opts.province && keyword
      ? keywordInText(opts.province, opts.content.h1, opts.content.intro, contentText)
        ? 90
        : 65
      : opts.province
        ? 70
        : 40;
  const geoScore = Math.min(
    100,
    Math.round(geoRelevance + (opts.content.sections.length >= 5 ? 10 : 0))
  );

  const faqScore = Math.min(100, opts.faq.length * 18);
  const headingScore = opts.content.sections.length >= 5 ? 90 : opts.content.sections.length * 15;
  const contentLengthScore = Math.min(100, Math.round(countWords(contentText) / 2));
  const originalityScore = Math.min(100, opts.originalityHint ?? 85);

  const qualityScore = Math.min(
    100,
    Math.round(
      passedCount * 8 +
        seoScore * 0.2 +
        geoScore * 0.1 +
        originalityScore * 0.15 +
        faqScore * 0.1 +
        headingScore * 0.1 +
        contentLengthScore * 0.1
    )
  );

  const warnings: string[] = [];
  for (const c of checks) {
    if (!c.passed) warnings.push(c.label);
  }
  if (keyword && keywordPlacementScore < 36) {
    warnings.push("Anahtar kelime yerleşimi zayıf");
  }

  return {
    passed: checks.every((c) => c.passed),
    originalityScore,
    seoScore,
    geoScore,
    qualityScore,
    checks,
    warnings,
  };
}
