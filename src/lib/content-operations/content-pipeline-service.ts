import { prisma } from "@/lib/db";
import {
  auditBlog,
  auditPage,
  auditProduct,
  auditRecoveryPage,
} from "@/lib/content-quality/content-quality-service";
import type { ContentAuditResult } from "@/lib/content-quality/types";
import { QUALITY_THRESHOLDS } from "@/lib/publishing-center/types";
import {
  generateContentPlan,
  publishPlanToEngines,
} from "@/lib/content-planning/content-planning-service";
import type { PlanEngine } from "@/lib/content-planning/types";
import { publishDraftInternal } from "@/lib/page-factory/publish/page-publish-service";
import {
  publishNow,
  queueContent,
  runPublishingQueue,
  enrichQueueItems,
  listQueue,
} from "@/lib/publishing-center/publishing-service";
import type { PublishingContentType } from "@prisma/client";
import type {
  ContentRef,
  FullPipelineResult,
  OperationsDashboard,
  PipelineStepResult,
  ProcessContentOptions,
  ProcessContentResult,
  RunPipelineOptions,
} from "./types";

export { QUALITY_THRESHOLDS } from "@/lib/publishing-center/types";

export function resolveStatusFromScores(scores: {
  seoScore: number;
  geoScore: number;
  qualityScore: number;
}): "APPROVED" | "REVIEW" {
  const passed =
    scores.seoScore >= QUALITY_THRESHOLDS.seoScore &&
    scores.geoScore >= QUALITY_THRESHOLDS.geoScore &&
    scores.qualityScore >= QUALITY_THRESHOLDS.qualityScore;
  return passed ? "APPROVED" : "REVIEW";
}

export async function mandatoryQualityAudit(
  contentType: PublishingContentType,
  contentId: string
): Promise<ContentAuditResult> {
  switch (contentType) {
    case "BLOG":
      return auditBlog(contentId);
    case "PAGE":
      return auditPage(contentId);
    case "PRODUCT":
      return auditProduct(contentId);
    case "RECOVERY_PAGE":
      return auditRecoveryPage(contentId);
    default:
      throw new Error(`Desteklenmeyen içerik tipi: ${contentType}`);
  }
}

/** Taslak ID → yayınlanmış sayfa ID (yoksa önce yayınla) */
async function resolvePageContentId(draftOrPageId: string): Promise<string> {
  const published = await prisma.pageFactoryPublishedPage.findUnique({
    where: { draftId: draftOrPageId },
    select: { id: true },
  });
  if (published) return published.id;

  const byId = await prisma.pageFactoryPublishedPage.findUnique({
    where: { id: draftOrPageId },
    select: { id: true },
  });
  if (byId) return byId.id;

  const draft = await prisma.pageFactoryContentDraft.findUnique({
    where: { id: draftOrPageId },
    select: { id: true },
  });
  if (draft) {
    const result = await publishDraftInternal(draft.id);
    return result.pageId;
  }

  throw new Error(`Sayfa içeriği çözümlenemedi: ${draftOrPageId}`);
}

export async function processContentThroughPipeline(
  contentType: PublishingContentType,
  contentId: string,
  opts: ProcessContentOptions = {}
): Promise<ProcessContentResult> {
  let resolvedId = contentId;
  let auditResult: ContentAuditResult;

  if (contentType === "PAGE") {
    const draft = await prisma.pageFactoryContentDraft.findUnique({ where: { id: contentId } });
    if (draft) {
      auditResult = await mandatoryQualityAudit("PAGE", contentId);
      resolvedId = await resolvePageContentId(contentId);
    } else {
      const page = await prisma.pageFactoryPublishedPage.findUnique({
        where: { id: contentId },
        select: { id: true, draftId: true },
      });
      if (!page) throw new Error("Sayfa bulunamadı");
      auditResult = await mandatoryQualityAudit("PAGE", page.draftId);
      resolvedId = page.id;
    }
  } else {
    auditResult = await mandatoryQualityAudit(contentType, contentId);
    resolvedId = contentId;
  }

  const queue = await queueContent({
    contentType,
    contentId: resolvedId,
    sourcePlanId: opts.sourcePlanId,
    publishMode: opts.publishMode || "AUTOMATIC",
    metadata: {
      ...opts.metadata,
      pipeline: "ENA_CEKIRDEK_AKIS_BIRLESTIRME_V1",
      auditScores: {
        seo: auditResult.seoScore,
        geo: auditResult.geoScore,
        quality: auditResult.qualityScore,
      },
    },
  });

  let published = false;
  if (opts.autoPublish && queue.status === "APPROVED") {
    await publishNow(queue.id);
    published = true;
  }

  return { audit: auditResult, queue, published };
}

export async function collectContentRefsFromPlan(planId: string): Promise<ContentRef[]> {
  const plan = await prisma.contentPlan.findUnique({
    where: { id: planId },
    include: { nodes: true },
  });
  if (!plan) return [];

  const refs: ContentRef[] = [];
  const seen = new Set<string>();

  const add = (contentType: PublishingContentType, contentId: string, metadata?: Record<string, unknown>) => {
    const key = `${contentType}:${contentId}`;
    if (!contentId || seen.has(key)) return;
    seen.add(key);
    refs.push({ contentType, contentId, sourcePlanId: planId, metadata });
  };

  for (const node of plan.nodes) {
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(node.metadataJson || "{}");
    } catch {
      /* skip */
    }
    if (meta.postId) add("BLOG", String(meta.postId), { ...meta, nodeType: node.nodeType });
    if (meta.pageId) add("PAGE", String(meta.pageId), { ...meta, nodeType: node.nodeType });
    if (meta.productId) add("PRODUCT", String(meta.productId), { ...meta, nodeType: node.nodeType });
  }

  const geoBlogs = await prisma.blogPost.findMany({
    where: { keyword: plan.primaryKeyword, sourceType: "GEO" },
    select: { id: true, province: true, district: true },
    take: 500,
  });
  for (const blog of geoBlogs) {
    add("BLOG", blog.id, { geo: true, province: blog.province, district: blog.district });
  }

  return refs;
}

export async function runFullPipelineFromPlan(
  planId: string,
  opts: RunPipelineOptions = {}
): Promise<FullPipelineResult> {
  const engines: PlanEngine[] = opts.engines || ["BLOG", "GEO", "PAGE"];
  const dryRun = !!opts.dryRun;

  const generated = await publishPlanToEngines(planId, engines, {
    dryRun,
    autoPublish: false,
    projectId: opts.projectId,
    skipPublishingQueue: true,
  });

  if (dryRun) {
    return {
      planId,
      dryRun: true,
      generated,
      pipeline: [],
      totalProcessed: 0,
      totalApproved: 0,
      totalReview: 0,
      totalPublished: 0,
    };
  }

  const refs = await collectContentRefsFromPlan(planId);
  const pipeline: PipelineStepResult[] = [];

  for (const ref of refs) {
    try {
      const result = await processContentThroughPipeline(ref.contentType, ref.contentId, {
        sourcePlanId: ref.sourcePlanId,
        autoPublish: opts.autoPublish !== false,
        publishMode: "AUTOMATIC",
        metadata: ref.metadata,
      });
      pipeline.push({
        contentType: ref.contentType,
        contentId: ref.contentId,
        audit: result.audit,
        queueStatus: result.queue.status,
        published: result.published,
        queueId: result.queue.id,
      });
    } catch (err) {
      pipeline.push({
        contentType: ref.contentType,
        contentId: ref.contentId,
        audit: {
          contentType: ref.contentType as ContentAuditResult["contentType"],
          contentId: ref.contentId,
          title: "",
          seoScore: 0,
          geoScore: 0,
          aeoScore: 0,
          qualityScore: 0,
          contentHealthScore: 0,
          internalLinkScore: 0,
          schemaScore: 0,
          metaScore: 0,
          issues: [],
          recommendations: [],
        },
        queueStatus: "REJECTED",
        published: false,
        queueId: "",
        error: err instanceof Error ? err.message : "hata",
      });
    }
  }

  const queueRun = await runPublishingQueue();

  return {
    planId,
    dryRun: false,
    generated,
    pipeline,
    queueRun,
    totalProcessed: pipeline.length,
    totalApproved: pipeline.filter((p) => p.queueStatus === "APPROVED" || p.published).length,
    totalReview: pipeline.filter((p) => p.queueStatus === "REVIEW").length,
    totalPublished: pipeline.filter((p) => p.published).length + (queueRun?.published || 0),
  };
}

export async function runFullPipelineFromKeyword(
  input: {
    primaryKeyword: string;
    category?: string | null;
    geoProvinces?: string[];
    planType?: string;
  },
  opts: RunPipelineOptions = {}
): Promise<FullPipelineResult & { planId: string }> {
  const plan = await generateContentPlan({
    primaryKeyword: input.primaryKeyword,
    category: input.category,
    geoProvinces: input.geoProvinces || ["Ankara", "İzmir"],
    planType: input.planType || "cluster",
    includeGeo: true,
  });

  const result = await runFullPipelineFromPlan(plan.plan.id, opts);
  return { ...result, planId: plan.plan.id };
}

export async function processLegacyRecoveryThroughPipeline(
  legacyUrlId: string,
  opts?: { autoPublish?: boolean }
): Promise<PipelineStepResult[]> {
  const item = await prisma.legacyUrl.findUnique({ where: { id: legacyUrlId } });
  if (!item) throw new Error("Legacy URL bulunamadı");

  const results: PipelineStepResult[] = [];

  if (item.generatedBlogId) {
    const r = await processContentThroughPipeline("BLOG", item.generatedBlogId, {
      autoPublish: opts?.autoPublish !== false,
      publishMode: "AUTOMATIC",
      metadata: { legacyUrlId, source: "LEGACY_RECOVERY" },
    });
    results.push({
      contentType: "BLOG",
      contentId: item.generatedBlogId,
      audit: r.audit,
      queueStatus: r.queue.status,
      published: r.published,
      queueId: r.queue.id,
    });
  }

  if (item.generatedPageId) {
    const r = await processContentThroughPipeline("PAGE", item.generatedPageId, {
      autoPublish: opts?.autoPublish !== false,
      publishMode: "AUTOMATIC",
      metadata: { legacyUrlId, source: "LEGACY_RECOVERY" },
    });
    results.push({
      contentType: "PAGE",
      contentId: item.generatedPageId,
      audit: r.audit,
      queueStatus: r.queue.status,
      published: r.published,
      queueId: r.queue.id,
    });
  }

  if (item.generatedBlogId || item.generatedPageId) {
    const recoveryAudit = await mandatoryQualityAudit("RECOVERY_PAGE", legacyUrlId);
    const queue = await queueContent({
      contentType: "RECOVERY_PAGE",
      contentId: legacyUrlId,
      publishMode: "AUTOMATIC",
      metadata: {
        legacyUrlId,
        generatedBlogId: item.generatedBlogId,
        generatedPageId: item.generatedPageId,
        source: "LEGACY_RECOVERY",
      },
    });
    let published = false;
    if (opts?.autoPublish !== false && queue.status === "APPROVED") {
      await publishNow(queue.id);
      published = true;
    }
    results.push({
      contentType: "RECOVERY_PAGE",
      contentId: legacyUrlId,
      audit: recoveryAudit,
      queueStatus: queue.status,
      published,
      queueId: queue.id,
    });
  }

  return results;
}

export async function getOperationsDashboard(): Promise<OperationsDashboard> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [totalPlans, plans, qualityPending, queuePending, publishedTotal, publishedToday, qualityAgg, recentBlogs] =
    await Promise.all([
      prisma.contentPlan.count(),
      prisma.contentPlan.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.publishingQueue.count({ where: { status: "REVIEW" } }),
      prisma.publishingQueue.count({
        where: { status: { in: ["DRAFT", "REVIEW", "APPROVED", "SCHEDULED"] } },
      }),
      prisma.publishingQueue.count({ where: { status: "PUBLISHED" } }),
      prisma.publishingQueue.count({
        where: { status: "PUBLISHED", publishedAt: { gte: startOfDay } },
      }),
      prisma.contentQualityAudit.aggregate({ _avg: { qualityScore: true } }),
      prisma.blogPost.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: { id: true, title: true, qualityScore: true, status: true },
      }),
    ]);

  const queueItems = await listQueue({ limit: 20 });
  await enrichQueueItems(queueItems);

  return {
    totalPlans,
    totalProductions: await prisma.blogPost.count(),
    qualityPending,
    queuePending,
    publishedTotal,
    publishedToday,
    avgQuality: Math.round(qualityAgg._avg.qualityScore || 0),
    recentPlans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      primaryKeyword: p.primaryKeyword,
      status: p.status,
      estimatedContentCount: p.estimatedContentCount,
      createdAt: p.createdAt.toISOString(),
    })),
    recentProductions: recentBlogs.map((b) => ({
      id: b.id,
      title: b.title,
      contentType: "BLOG",
      qualityScore: b.qualityScore,
      status: b.status,
    })),
  };
}

export async function listQualityPending(limit = 50) {
  const items = await listQueue({ status: "REVIEW", limit });
  return enrichQueueItems(items);
}

export async function listPipelinePublished(limit = 50) {
  const items = await listQueue({ status: "PUBLISHED", limit });
  return enrichQueueItems(items);
}
