import type {
  ContentAuditInput,
  ContentAuditResult,
  ContentQualityIssue,
  ContentQualityRecommendation,
} from "./types";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function wordRepeatRatio(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (words.length < 10) return 0;
  const unique = new Set(words);
  return 1 - unique.size / words.length;
}

function hasValidSchema(schema: Record<string, unknown> | null): boolean {
  if (!schema || Object.keys(schema).length === 0) return false;
  if ("@graph" in schema && Array.isArray(schema["@graph"])) return true;
  const t = schema["@type"];
  return typeof t === "string" && t.length > 0;
}

function hasFaqSchema(schema: Record<string, unknown> | null): boolean {
  if (!schema) return false;
  const graph = schema["@graph"];
  if (Array.isArray(graph)) {
    return graph.some((g) => (g as { "@type"?: string })["@type"] === "FAQPage");
  }
  return schema["@type"] === "FAQPage";
}

function keywordInText(keyword: string, ...texts: string[]): boolean {
  if (!keyword.trim()) return false;
  const kw = keyword.toLowerCase();
  return texts.some((t) => t.toLowerCase().includes(kw));
}

export function runContentAudit(input: ContentAuditInput): ContentAuditResult {
  const issues: ContentQualityIssue[] = [];
  const recommendations: ContentQualityRecommendation[] = [];

  // ── Meta ──
  let metaPoints = 0;
  if (input.metaTitle?.trim()) metaPoints += 40;
  else issues.push({ type: "MISSING_META", severity: "critical", message: "Meta title eksik", field: "metaTitle" });
  if (input.metaDescription?.trim()) metaPoints += 40;
  else issues.push({ type: "MISSING_META", severity: "critical", message: "Meta description eksik", field: "metaDescription" });
  if (input.metaTitle.length >= 30 && input.metaTitle.length <= 60) metaPoints += 20;
  const metaScore = Math.min(100, metaPoints);

  // ── SEO ──
  let seoPoints = 0;
  if (input.h1?.trim()) seoPoints += 25;
  else issues.push({ type: "LOW_SEO", severity: "critical", message: "H1 başlık eksik", field: "h1" });
  if (input.h2Count >= 3) seoPoints += 25;
  else if (input.h2Count >= 1) seoPoints += 10;
  else issues.push({ type: "LOW_SEO", severity: "warning", message: "Yeterli H2 başlığı yok", field: "h2" });
  if (input.keyword && keywordInText(input.keyword, input.h1, input.metaTitle, input.bodyText)) seoPoints += 25;
  if (input.canonical) seoPoints += 15;
  else recommendations.push({
    id: "add-canonical",
    priority: "medium",
    title: "Canonical URL ekle",
    description: "Duplicate içerik riskini azaltmak için canonical tanımlayın.",
    action: "canonical",
  });
  if (input.metaDescription.length >= 80) seoPoints += 10;
  const seoScore = Math.min(100, seoPoints);

  if (seoScore < 50) {
    issues.push({ type: "LOW_SEO", severity: "warning", message: `SEO skoru düşük (${seoScore})` });
  }

  // ── GEO ──
  let geoPoints = 40;
  const geoText = `${input.bodyText} ${input.title} ${input.province || ""} ${input.district || ""}`;
  if (input.province) geoPoints += 25;
  if (input.district) geoPoints += 15;
  const locTerms = ["istanbul", "ankara", "izmir", "bölge", "şehir", "ilçe", "lokasyon", "yerel"];
  if (locTerms.some((t) => geoText.toLowerCase().includes(t))) geoPoints += 20;
  const geoScore = Math.min(100, geoPoints);
  if (geoScore < 50 && (input.province || input.contentType === "BLOG")) {
    issues.push({ type: "LOW_GEO", severity: "warning", message: `GEO sinyali zayıf (${geoScore})` });
  }

  // ── AEO ──
  let aeoPoints = 0;
  if (input.faq.length >= 3) aeoPoints += 40;
  else issues.push({ type: "MISSING_FAQ", severity: "critical", message: "FAQ en az 3 soru içermeli" });
  if (input.faq.length >= 5) aeoPoints += 20;
  const validFaq = input.faq.every((f) => f.question?.trim() && f.answer?.trim());
  if (validFaq && input.faq.length > 0) aeoPoints += 20;
  if (hasFaqSchema(input.schema)) aeoPoints += 20;
  else if (input.faq.length > 0) {
    recommendations.push({
      id: "add-faq-schema",
      priority: "high",
      title: "FAQ JSON-LD ekle",
      description: "FAQPage schema ile AEO görünürlüğünü artırın.",
      action: "schema",
    });
  }
  const aeoScore = Math.min(100, aeoPoints);
  if (aeoScore < 50) {
    issues.push({ type: "LOW_AEO", severity: "warning", message: `AEO skoru düşük (${aeoScore})` });
  }

  // ── Schema ──
  let schemaPoints = 0;
  if (hasValidSchema(input.schema)) schemaPoints += 70;
  else issues.push({ type: "MISSING_SCHEMA", severity: "critical", message: "JSON-LD schema eksik veya geçersiz" });
  if (hasFaqSchema(input.schema)) schemaPoints += 30;
  const schemaScore = Math.min(100, schemaPoints);

  // ── Internal Links ──
  const totalLinks = input.internalLinks.blogs + input.internalLinks.pages + input.internalLinks.products;
  let linkPoints = 0;
  if (input.internalLinks.blogs > 0) linkPoints += 30;
  if (input.internalLinks.pages > 0) linkPoints += 30;
  if (input.internalLinks.products > 0) linkPoints += 30;
  if (totalLinks >= 3) linkPoints += 10;
  if (totalLinks === 0) {
    issues.push({ type: "BROKEN_INTERNAL_LINK", severity: "warning", message: "İç link önerisi yok" });
    recommendations.push({
      id: "add-internal-links",
      priority: "medium",
      title: "İç linkler ekle",
      description: "İlgili blog, sayfa ve ürün bağlantıları ekleyin.",
      action: "internalLinks",
    });
  }
  const internalLinkScore = Math.min(100, linkPoints);

  // ── Content Health ──
  const wordCount = countWords(input.bodyText);
  let healthPoints = 0;
  if (wordCount >= 80) healthPoints += 30;
  else if (wordCount >= 40) healthPoints += 15;
  else issues.push({ type: "LOW_CONTENT", severity: "critical", message: `İçerik çok kısa (${wordCount} kelime)` });
  if (wordCount >= 200) healthPoints += 20;
  if (input.h2Count >= 5) healthPoints += 25;
  else if (input.h2Count >= 3) healthPoints += 15;
  const repeatRatio = wordRepeatRatio(input.bodyText);
  if (repeatRatio < 0.4) healthPoints += 15;
  else issues.push({ type: "DUPLICATE_RISK", severity: "warning", message: "Yüksek kelime tekrar oranı" });
  const avgSentenceLen = input.bodyText.split(/[.!?]+/).filter(Boolean).length
    ? wordCount / Math.max(1, input.bodyText.split(/[.!?]+/).filter(Boolean).length)
    : 0;
  if (avgSentenceLen > 5 && avgSentenceLen < 30) healthPoints += 10;
  const contentHealthScore = Math.min(100, healthPoints);

  if (contentHealthScore < 50) {
    recommendations.push({
      id: "expand-content",
      priority: "high",
      title: "İçeriği genişletin",
      description: "En az 5 bölüm ve 200+ kelime hedefleyin.",
      action: "content",
    });
  }

  const qualityScore = Math.round(
    seoScore * 0.2 +
      geoScore * 0.1 +
      aeoScore * 0.15 +
      schemaScore * 0.1 +
      metaScore * 0.1 +
      internalLinkScore * 0.1 +
      contentHealthScore * 0.25
  );

  return {
    contentType: input.contentType,
    contentId: input.contentId,
    title: input.title,
    seoScore,
    geoScore,
    aeoScore,
    qualityScore,
    contentHealthScore,
    internalLinkScore,
    schemaScore,
    metaScore,
    issues,
    recommendations,
  };
}

export function buildRecommendationsFromIssues(
  issues: ContentQualityIssue[],
  existing: ContentQualityRecommendation[] = []
): ContentQualityRecommendation[] {
  const recs = [...existing];
  const seen = new Set(recs.map((r) => r.id));

  for (const issue of issues) {
    if (issue.type === "MISSING_META" && !seen.has("fix-meta")) {
      recs.push({
        id: "fix-meta",
        priority: "high",
        title: "Meta bilgilerini tamamlayın",
        description: issue.message,
        action: "meta",
      });
      seen.add("fix-meta");
    }
    if (issue.type === "MISSING_FAQ" && !seen.has("add-faq")) {
      recs.push({
        id: "add-faq",
        priority: "high",
        title: "FAQ bölümü ekleyin",
        description: "En az 3 soru-cevap ekleyin.",
        action: "faq",
      });
      seen.add("add-faq");
    }
    if (issue.type === "LOW_GEO" && !seen.has("improve-geo")) {
      recs.push({
        id: "improve-geo",
        priority: "medium",
        title: "GEO sinyallerini güçlendirin",
        description: "Şehir, ilçe ve lokasyon ifadeleri ekleyin.",
        action: "geo",
      });
      seen.add("improve-geo");
    }
  }

  return recs;
}
