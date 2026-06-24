import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/blog-engine/blog-service";
import { normalizeInternalLinks } from "@/lib/blog-engine/blog-internal-links";
import type { BlogContentPayload, BlogFaqItem } from "@/lib/blog-engine/blog-types";
import { blogAbsoluteUrl } from "@/lib/blog-engine/blog-seo";
import { validateGeneratedContent } from "@/lib/ai-writer/ai-content-writer";
import { extractAiWriterFromMetadataJson, isPublishableAiContent } from "@/lib/ai-writer/publish-gate";
import { buildRecommendationsFromIssues, runContentAudit } from "./audit-engine";
import type {
  ContentAuditResult,
  ContentAuditSummary,
  ContentQualityContentType,
  ContentQualityDashboard,
  ContentQualityRecommendation,
} from "./types";

function safeParseLinks(raw: string) {
  try {
    const parsed = JSON.parse(raw || "{}");
    const links = normalizeInternalLinks(parsed);
    return {
      blogs: links.relatedBlogs.length,
      pages: links.relatedPages.length,
      products: links.relatedProducts.length,
    };
  } catch {
    return { blogs: 0, pages: 0, products: 0 };
  }
}

async function persistAudit(result: ContentAuditResult) {
  const allRecs = buildRecommendationsFromIssues(result.issues, result.recommendations);
  return prisma.contentQualityAudit.upsert({
    where: {
      contentType_contentId: {
        contentType: result.contentType,
        contentId: result.contentId,
      },
    },
    create: {
      contentType: result.contentType,
      contentId: result.contentId,
      seoScore: result.seoScore,
      geoScore: result.geoScore,
      aeoScore: result.aeoScore,
      qualityScore: result.qualityScore,
      contentHealthScore: result.contentHealthScore,
      internalLinkScore: result.internalLinkScore,
      schemaScore: result.schemaScore,
      metaScore: result.metaScore,
      issuesJson: JSON.stringify(result.issues),
      recommendationsJson: JSON.stringify(allRecs),
      auditedAt: new Date(),
    },
    update: {
      seoScore: result.seoScore,
      geoScore: result.geoScore,
      aeoScore: result.aeoScore,
      qualityScore: result.qualityScore,
      contentHealthScore: result.contentHealthScore,
      internalLinkScore: result.internalLinkScore,
      schemaScore: result.schemaScore,
      metaScore: result.metaScore,
      issuesJson: JSON.stringify(result.issues),
      recommendationsJson: JSON.stringify(allRecs),
      auditedAt: new Date(),
    },
  });
}

export async function auditBlog(blogId: string): Promise<ContentAuditResult> {
  const post = await prisma.blogPost.findUnique({ where: { id: blogId } });
  if (!post) throw new Error("Blog bulunamadı");

  const content = parseJson<BlogContentPayload>(post.contentJson, {
    version: "ENA_BLOG_ENGINE_V1",
    h1: post.title,
    intro: post.excerpt,
    sections: [],
    conclusion: "",
  });
  const faq = parseJson<BlogFaqItem[]>(post.faqJson, []);
  const schema = parseJson<Record<string, unknown>>(post.schemaJson, {});
  const bodyText = [content.intro, ...content.sections.map((s) => `${s.heading} ${s.body}`), content.conclusion].join(" ");

  const result = runContentAudit({
    contentType: "BLOG",
    contentId: post.id,
    title: post.title,
    metaTitle: post.seoTitle,
    metaDescription: post.seoDescription,
    h1: content.h1 || post.title,
    keyword: post.keyword,
    province: post.province,
    district: post.district,
    bodyText,
    h2Count: content.sections.length,
    faq,
    schema,
    internalLinks: safeParseLinks(post.internalLinksJson),
    canonical: blogAbsoluteUrl(`/blog/${post.slug}`),
    existingSeoScore: post.seoScore,
    existingGeoScore: post.geoScore,
    existingQualityScore: post.qualityScore,
  });

  const aiMeta = extractAiWriterFromMetadataJson(post.metadataJson);
  const aiGate = isPublishableAiContent(aiMeta);
  if (!aiGate.publishable) {
    result.issues.push({
      type: "AI_WRITER",
      severity: "critical",
      message: `AI içerik geçersiz: ${aiGate.reason || "bilinmeyen"}`,
      field: "aiWriter",
    });
    result.qualityScore = Math.min(result.qualityScore, 40);
  }

  const validation = validateGeneratedContent({
    contentType: post.province ? "GEO" : "BLOG",
    h1: content.h1 || post.title,
    intro: content.intro,
    sections: content.sections,
    conclusion: content.conclusion,
    faq,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    schema,
    keyword: post.keyword,
  });
  if (!validation.passed) {
    for (const issue of validation.issues) {
      result.issues.push({
        type: "AI_VALIDATION",
        severity: "warning",
        message: issue,
        field: "content",
      });
    }
    result.qualityScore = Math.min(result.qualityScore, 50);
  }

  await persistAudit(result);
  return result;
}

export async function auditPage(pageId: string): Promise<ContentAuditResult> {
  const draft = await prisma.pageFactoryContentDraft.findUnique({ where: { id: pageId } });
  if (!draft) throw new Error("Sayfa bulunamadı");

  type Section = { heading?: string; body?: string };
  let sections: Section[] = [];
  try {
    sections = JSON.parse(draft.bodyJson || "[]");
  } catch {
    /* skip */
  }
  let faq: Array<{ question: string; answer: string }> = [];
  try {
    faq = JSON.parse(draft.faqJson || "[]");
  } catch {
    /* skip */
  }
  const schema = parseJson<Record<string, unknown>>(draft.schemaJson, {});
  const bodyText = [draft.intro, ...sections.map((s) => `${s.heading || ""} ${s.body || ""}`)].join(" ");

  const result = runContentAudit({
    contentType: "PAGE",
    contentId: draft.id,
    title: draft.title,
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    h1: draft.h1 || draft.title,
    bodyText,
    h2Count: sections.length,
    faq,
    schema,
    internalLinks: safeParseLinks(draft.internalLinksJson),
    existingSeoScore: draft.seoScore,
    existingGeoScore: draft.geoScore,
    existingAeoScore: draft.aeoScore,
  });

  await persistAudit(result);
  return result;
}

export async function auditProduct(productId: string): Promise<ContentAuditResult> {
  const product = await prisma.productUniverse.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Ürün bulunamadı");

  const bodyText = [product.normalizedName, product.descriptionClean, product.categoryPath, product.brand].join(" ");
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(product.metadataJson || "{}");
  } catch {
    /* skip */
  }

  const result = runContentAudit({
    contentType: "PRODUCT",
    contentId: product.id,
    title: product.normalizedName,
    metaTitle: product.normalizedName,
    metaDescription: product.descriptionClean.slice(0, 160),
    h1: product.normalizedName,
    keyword: product.normalizedName,
    bodyText,
    h2Count: product.descriptionClean.length > 100 ? 2 : 0,
    faq: [],
    schema: (metadata.schema as Record<string, unknown>) || null,
    internalLinks: { blogs: 0, pages: 0, products: 0 },
    existingQualityScore: product.qualityScore,
  });

  if (!product.descriptionClean?.trim()) {
    result.issues.push({
      type: "LOW_CONTENT",
      severity: "critical",
      message: "Ürün açıklaması eksik",
      field: "descriptionClean",
    });
    result.recommendations.push({
      id: "product-description",
      priority: "high",
      title: "Ürün açıklaması ekleyin",
      description: "descriptionClean alanını doldurun.",
      action: "description",
    });
  }

  await persistAudit(result);
  return result;
}

export async function auditRecoveryPage(legacyUrlId: string): Promise<ContentAuditResult> {
  const item = await prisma.legacyUrl.findUnique({ where: { id: legacyUrlId } });
  if (!item) throw new Error("Kurtarma kaydı bulunamadı");

  if (item.generatedBlogId) return auditBlog(item.generatedBlogId);
  if (item.generatedPageId) return auditPage(item.generatedPageId);

  const result = runContentAudit({
    contentType: "RECOVERY_PAGE",
    contentId: item.id,
    title: item.url,
    metaTitle: "",
    metaDescription: "",
    h1: item.url,
    bodyText: item.notes || "",
    h2Count: 0,
    faq: [],
    schema: null,
    internalLinks: { blogs: 0, pages: 0, products: 0 },
  });

  result.issues.push({
    type: "LOW_CONTENT",
    severity: "warning",
    message: "Kurtarma içeriği henüz üretilmemiş",
  });
  result.recommendations.push({
    id: "generate-recovery",
    priority: "high",
    title: "Kurtarma içeriği üretin",
    description: `${item.recoveryStrategy} stratejisini uygulayın.`,
    action: "recovery",
  });

  await persistAudit(result);
  return result;
}

export async function auditAll(opts?: { limit?: number }): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const limit = opts?.limit || 500;
  const result = { processed: 0, succeeded: 0, failed: 0, errors: [] as string[] };

  const [blogs, pages, products, recoveries] = await Promise.all([
    prisma.blogPost.findMany({ select: { id: true }, take: limit }),
    prisma.pageFactoryContentDraft.findMany({ select: { id: true }, take: limit }),
    prisma.productUniverse.findMany({ select: { id: true }, take: limit }),
    prisma.legacyUrl.findMany({
      where: { OR: [{ generatedBlogId: { not: null } }, { generatedPageId: { not: null } }] },
      select: { id: true },
      take: limit,
    }),
  ]);

  const tasks: Array<() => Promise<void>> = [
    ...blogs.map((b) => async () => {
      result.processed++;
      try {
        await auditBlog(b.id);
        result.succeeded++;
      } catch (e) {
        result.failed++;
        result.errors.push(`blog:${b.id}`);
      }
    }),
    ...pages.map((p) => async () => {
      result.processed++;
      try {
        await auditPage(p.id);
        result.succeeded++;
      } catch (e) {
        result.failed++;
        result.errors.push(`page:${p.id}`);
      }
    }),
    ...products.map((p) => async () => {
      result.processed++;
      try {
        await auditProduct(p.id);
        result.succeeded++;
      } catch (e) {
        result.failed++;
        result.errors.push(`product:${p.id}`);
      }
    }),
    ...recoveries.map((r) => async () => {
      result.processed++;
      try {
        await auditRecoveryPage(r.id);
        result.succeeded++;
      } catch (e) {
        result.failed++;
        result.errors.push(`recovery:${r.id}`);
      }
    }),
  ];

  for (const task of tasks) {
    await task();
  }

  return result;
}

function toSummary(audit: {
  id: string;
  contentType: ContentQualityContentType;
  contentId: string;
  qualityScore: number;
  issuesJson: string;
  auditedAt: Date;
}, title: string): ContentAuditSummary {
  let issueCount = 0;
  try {
    issueCount = JSON.parse(audit.issuesJson || "[]").length;
  } catch {
    /* skip */
  }
  return {
    id: audit.id,
    contentType: audit.contentType,
    contentId: audit.contentId,
    title,
    qualityScore: audit.qualityScore,
    issueCount,
    auditedAt: audit.auditedAt.toISOString(),
  };
}

async function resolveTitle(contentType: ContentQualityContentType, contentId: string): Promise<string> {
  switch (contentType) {
    case "BLOG": {
      const p = await prisma.blogPost.findUnique({ where: { id: contentId }, select: { title: true } });
      return p?.title || contentId;
    }
    case "PAGE": {
      const p = await prisma.pageFactoryContentDraft.findUnique({ where: { id: contentId }, select: { title: true } });
      return p?.title || contentId;
    }
    case "PRODUCT": {
      const p = await prisma.productUniverse.findUnique({ where: { id: contentId }, select: { normalizedName: true } });
      return p?.normalizedName || contentId;
    }
    case "RECOVERY_PAGE": {
      const p = await prisma.legacyUrl.findUnique({ where: { id: contentId }, select: { url: true } });
      return p?.url || contentId;
    }
    default:
      return contentId;
  }
}

export async function getAuditReport(): Promise<ContentQualityDashboard> {
  const audits = await prisma.contentQualityAudit.findMany({ orderBy: { auditedAt: "desc" } });
  const n = audits.length || 1;

  let criticalIssues = 0;
  for (const a of audits) {
    try {
      const issues = JSON.parse(a.issuesJson || "[]");
      criticalIssues += issues.filter((i: { severity?: string }) => i.severity === "critical").length;
    } catch {
      /* skip */
    }
  }

  const byType: Record<ContentQualityContentType, number> = {
    BLOG: 0,
    PAGE: 0,
    PRODUCT: 0,
    RECOVERY_PAGE: 0,
  };
  for (const a of audits) {
    byType[a.contentType as ContentQualityContentType]++;
  }

  const summaries: ContentAuditSummary[] = [];
  for (const a of audits.slice(0, 50)) {
    const title = await resolveTitle(a.contentType as ContentQualityContentType, a.contentId);
    summaries.push(toSummary(a as Parameters<typeof toSummary>[0], title));
  }

  const worst = [...summaries].sort((a, b) => a.qualityScore - b.qualityScore).slice(0, 10);
  const best = [...summaries].sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 10);
  const mostIssues = [...summaries].sort((a, b) => b.issueCount - a.issueCount).slice(0, 10);

  return {
    totalContent: audits.length,
    avgSeo: Math.round(audits.reduce((s, a) => s + a.seoScore, 0) / n),
    avgGeo: Math.round(audits.reduce((s, a) => s + a.geoScore, 0) / n),
    avgAeo: Math.round(audits.reduce((s, a) => s + a.aeoScore, 0) / n),
    avgQuality: Math.round(audits.reduce((s, a) => s + a.qualityScore, 0) / n),
    criticalIssues,
    byType,
    worst,
    best,
    mostIssues,
  };
}

export async function getRecommendations(opts?: {
  contentType?: ContentQualityContentType;
  limit?: number;
}): Promise<Array<ContentQualityRecommendation & { contentType: string; contentId: string; title: string }>> {
  const where = opts?.contentType ? { contentType: opts.contentType } : {};
  const audits = await prisma.contentQualityAudit.findMany({
    where,
    orderBy: { qualityScore: "asc" },
    take: opts?.limit || 50,
  });

  const all: Array<ContentQualityRecommendation & { contentType: string; contentId: string; title: string }> = [];

  for (const a of audits) {
    const title = await resolveTitle(a.contentType as ContentQualityContentType, a.contentId);
    try {
      const recs: ContentQualityRecommendation[] = JSON.parse(a.recommendationsJson || "[]");
      for (const r of recs) {
        all.push({ ...r, contentType: a.contentType, contentId: a.contentId, title });
      }
    } catch {
      /* skip */
    }
  }

  return all;
}

export async function recalculateScores(opts?: { contentType?: ContentQualityContentType }): Promise<{
  processed: number;
  succeeded: number;
}> {
  const where = opts?.contentType ? { contentType: opts.contentType } : {};
  const audits = await prisma.contentQualityAudit.findMany({ where });

  let succeeded = 0;
  for (const a of audits) {
    try {
      switch (a.contentType) {
        case "BLOG":
          await auditBlog(a.contentId);
          break;
        case "PAGE":
          await auditPage(a.contentId);
          break;
        case "PRODUCT":
          await auditProduct(a.contentId);
          break;
        case "RECOVERY_PAGE":
          await auditRecoveryPage(a.contentId);
          break;
      }
      succeeded++;
    } catch {
      /* skip */
    }
  }

  return { processed: audits.length, succeeded };
}

export async function listAudits(filters: {
  contentType?: ContentQualityContentType;
  page?: number;
  limit?: number;
  minQuality?: number;
  maxQuality?: number;
}) {
  const page = filters.page || 1;
  const limit = Math.min(100, filters.limit || 30);
  const where = {
    ...(filters.contentType ? { contentType: filters.contentType } : {}),
    ...(filters.minQuality != null ? { qualityScore: { gte: filters.minQuality } } : {}),
    ...(filters.maxQuality != null
      ? { qualityScore: { ...(filters.minQuality != null ? { gte: filters.minQuality } : {}), lte: filters.maxQuality } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.contentQualityAudit.findMany({
      where,
      orderBy: { auditedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contentQualityAudit.count({ where }),
  ]);

  const enriched = await Promise.all(
    items.map(async (a) => ({
      ...a,
      title: await resolveTitle(a.contentType as ContentQualityContentType, a.contentId),
      issues: JSON.parse(a.issuesJson || "[]"),
      recommendations: JSON.parse(a.recommendationsJson || "[]"),
    }))
  );

  return { items: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function listIssues(filters?: { contentType?: ContentQualityContentType; limit?: number }) {
  const audits = await listAudits({
    contentType: filters?.contentType,
    limit: filters?.limit || 100,
    maxQuality: 100,
  });

  const issues: Array<{
    contentType: string;
    contentId: string;
    title: string;
    issue: unknown;
    qualityScore: number;
  }> = [];

  for (const a of audits.items) {
    for (const issue of a.issues as unknown[]) {
      issues.push({
        contentType: a.contentType,
        contentId: a.contentId,
        title: a.title,
        issue,
        qualityScore: a.qualityScore,
      });
    }
  }

  return issues;
}
