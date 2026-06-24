import { prisma } from "@/lib/db";
import { publishBlog, archiveBlog } from "@/lib/blog-engine/blog-service";
import { auditBlog } from "@/lib/content-quality/content-quality-service";
import { extractAiWriterFromMetadataJson, isPublishableAiContent } from "@/lib/ai-writer/publish-gate";
import type {
  PublishingContentType,
  PublishingMode,
  PublishingQueue,
  PublishingQueueStatus,
} from "@prisma/client";
import {
  ACTIVE_QUEUE_STATUSES,
  QUALITY_THRESHOLDS,
  type BatchResult,
  type CalendarDay,
  type PublishingStats,
  type QualityCheckResult,
  type QueueContentInput,
  type RunQueueResult,
} from "./types";

function parseMeta(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function mapContentTypeToAuditType(
  contentType: PublishingContentType
): "BLOG" | "PAGE" | "PRODUCT" | "RECOVERY_PAGE" {
  return contentType;
}

export async function evaluateQualityForContent(
  contentType: PublishingContentType,
  contentId: string
): Promise<QualityCheckResult> {
  const auditType = mapContentTypeToAuditType(contentType);
  const audit = await prisma.contentQualityAudit.findUnique({
    where: { contentType_contentId: { contentType: auditType, contentId } },
  });

  if (audit) {
    const passed =
      audit.seoScore >= QUALITY_THRESHOLDS.seoScore &&
      audit.geoScore >= QUALITY_THRESHOLDS.geoScore &&
      audit.qualityScore >= QUALITY_THRESHOLDS.qualityScore;
    return {
      passed,
      seoScore: audit.seoScore,
      geoScore: audit.geoScore,
      qualityScore: audit.qualityScore,
      suggestedStatus: passed ? "APPROVED" : "REVIEW",
    };
  }

  if (contentType === "BLOG") {
    try {
      const result = await auditBlog(contentId);
      const passed =
        result.seoScore >= QUALITY_THRESHOLDS.seoScore &&
        result.geoScore >= QUALITY_THRESHOLDS.geoScore &&
        result.qualityScore >= QUALITY_THRESHOLDS.qualityScore;
      return {
        passed,
        seoScore: result.seoScore,
        geoScore: result.geoScore,
        qualityScore: result.qualityScore,
        suggestedStatus: passed ? "APPROVED" : "REVIEW",
      };
    } catch {
      return { passed: false, seoScore: 0, geoScore: 0, qualityScore: 0, suggestedStatus: "REVIEW" };
    }
  }

  const post = await prisma.blogPost.findUnique({ where: { id: contentId } });
  if (post) {
    const passed =
      post.seoScore >= QUALITY_THRESHOLDS.seoScore &&
      post.geoScore >= QUALITY_THRESHOLDS.geoScore &&
      post.qualityScore >= QUALITY_THRESHOLDS.qualityScore;
    return {
      passed,
      seoScore: post.seoScore,
      geoScore: post.geoScore,
      qualityScore: post.qualityScore,
      suggestedStatus: passed ? "APPROVED" : "REVIEW",
    };
  }

  return { passed: false, seoScore: 0, geoScore: 0, qualityScore: 0, suggestedStatus: "REVIEW" };
}

async function evaluateAiWriterGate(
  contentType: PublishingContentType,
  contentId: string
): Promise<{ blocked: boolean; reason?: string }> {
  if (contentType === "BLOG") {
    const post = await prisma.blogPost.findUnique({ where: { id: contentId } });
    if (!post) return { blocked: true, reason: "CONTENT_NOT_FOUND" };
    const aiMeta = extractAiWriterFromMetadataJson(post.metadataJson);
    const gate = isPublishableAiContent(aiMeta);
    return { blocked: !gate.publishable, reason: gate.reason };
  }

  if (contentType === "PAGE" || contentType === "RECOVERY_PAGE") {
    const draft = await prisma.pageFactoryContentDraft.findUnique({ where: { id: contentId } });
    if (draft) {
      const aiMeta = extractAiWriterFromMetadataJson(draft.metadataJson);
      const gate = isPublishableAiContent(aiMeta);
      return { blocked: !gate.publishable, reason: gate.reason };
    }
  }

  return { blocked: false };
}

function resolveInitialStatus(
  publishMode: PublishingMode,
  quality: QualityCheckResult,
  skipQualityCheck?: boolean
): PublishingQueueStatus {
  if (publishMode === "MANUAL") return "DRAFT";
  if (skipQualityCheck) return publishMode === "SCHEDULED" ? "SCHEDULED" : "APPROVED";
  return quality.suggestedStatus;
}

async function findActiveQueueItem(contentType: PublishingContentType, contentId: string) {
  return prisma.publishingQueue.findFirst({
    where: {
      contentType,
      contentId,
      status: { in: ACTIVE_QUEUE_STATUSES },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function queueContent(input: QueueContentInput): Promise<PublishingQueue> {
  const publishMode = input.publishMode || "MANUAL";
  const quality = input.skipQualityCheck
    ? { passed: true, seoScore: 100, geoScore: 100, qualityScore: 100, suggestedStatus: "APPROVED" as const }
    : await evaluateQualityForContent(input.contentType, input.contentId);

  const aiGate = input.skipQualityCheck ? { blocked: false } : await evaluateAiWriterGate(input.contentType, input.contentId);
  const effectiveQuality: QualityCheckResult =
    aiGate.blocked || !quality.passed
      ? { ...quality, passed: false, suggestedStatus: "REVIEW" as const }
      : quality;

  const status = resolveInitialStatus(publishMode, effectiveQuality, input.skipQualityCheck);
  const metadata = {
    ...(input.metadata || {}),
    quality: effectiveQuality,
    aiWriterGate: aiGate.blocked ? { blocked: true, reason: aiGate.reason } : { blocked: false },
    queuedAt: new Date().toISOString(),
  };

  const existing = await findActiveQueueItem(input.contentType, input.contentId);
  if (existing) {
    return prisma.publishingQueue.update({
      where: { id: existing.id },
      data: {
        sourcePlanId: input.sourcePlanId || existing.sourcePlanId,
        publishMode,
        priority: input.priority ?? existing.priority,
        scheduledAt: input.scheduledAt ?? existing.scheduledAt,
        status: input.scheduledAt ? "SCHEDULED" : status,
        metadataJson: JSON.stringify(metadata),
      },
    });
  }

  return prisma.publishingQueue.create({
    data: {
      contentType: input.contentType,
      contentId: input.contentId,
      sourcePlanId: input.sourcePlanId || null,
      publishMode,
      priority: input.priority ?? 50,
      scheduledAt: input.scheduledAt || null,
      status: input.scheduledAt ? "SCHEDULED" : status,
      metadataJson: JSON.stringify(metadata),
    },
  });
}

export async function queuePlan(
  planId: string,
  opts?: { publishMode?: PublishingMode; priority?: number }
): Promise<{ queued: number; items: PublishingQueue[] }> {
  const plan = await prisma.contentPlan.findUnique({
    where: { id: planId },
    include: { nodes: true },
  });
  if (!plan) throw new Error("Plan bulunamadı");

  const items: PublishingQueue[] = [];
  for (const node of plan.nodes) {
    const meta = parseMeta(node.metadataJson);
    const postId = meta.postId as string | undefined;
    const pageId = meta.pageId as string | undefined;
    const productId = meta.productId as string | undefined;

    if (node.nodeType === "GEO_PROVINCE" || node.nodeType === "GEO_DISTRICT") {
      if (postId) {
        items.push(
          await queueContent({
            contentType: "BLOG",
            contentId: postId,
            sourcePlanId: planId,
            publishMode: opts?.publishMode || "AUTOMATIC",
            priority: opts?.priority ?? node.priority,
            metadata: {
              planNodeId: node.id,
              nodeType: node.nodeType,
              province: node.province,
              district: node.district,
              geoScope: node.nodeType === "GEO_DISTRICT" ? "district" : "province",
            },
          })
        );
      } else if (node.keyword) {
        const blog = await prisma.blogPost.findFirst({
          where: {
            keyword: node.keyword,
            province: node.province,
            district: node.district,
            sourceType: "GEO",
          },
        });
        if (blog) {
          items.push(
            await queueContent({
              contentType: "BLOG",
              contentId: blog.id,
              sourcePlanId: planId,
              publishMode: opts?.publishMode || "AUTOMATIC",
              priority: opts?.priority ?? node.priority,
              metadata: {
                planNodeId: node.id,
                province: node.province,
                district: node.district,
                geoScope: node.nodeType === "GEO_DISTRICT" ? "district" : "province",
              },
            })
          );
        }
      }
      continue;
    }

    if (postId) {
      items.push(
        await queueContent({
          contentType: "BLOG",
          contentId: postId,
          sourcePlanId: planId,
          publishMode: opts?.publishMode || "MANUAL",
          priority: opts?.priority ?? node.priority,
          metadata: { planNodeId: node.id, nodeType: node.nodeType },
        })
      );
    } else if (pageId) {
      items.push(
        await queueContent({
          contentType: "PAGE",
          contentId: pageId,
          sourcePlanId: planId,
          publishMode: opts?.publishMode || "MANUAL",
          priority: opts?.priority ?? node.priority,
          metadata: { planNodeId: node.id, nodeType: node.nodeType },
        })
      );
    } else if (productId) {
      items.push(
        await queueContent({
          contentType: "PRODUCT",
          contentId: productId,
          sourcePlanId: planId,
          publishMode: opts?.publishMode || "MANUAL",
          priority: opts?.priority ?? node.priority,
          metadata: { planNodeId: node.id, nodeType: node.nodeType },
        })
      );
    }
  }

  return { queued: items.length, items };
}

export async function queueGeoContents(opts: {
  keyword: string;
  province?: string;
  district?: string;
  publishMode?: PublishingMode;
  sourcePlanId?: string;
}): Promise<{ queued: number; items: PublishingQueue[] }> {
  const where: Record<string, unknown> = {
    sourceType: "GEO",
    keyword: opts.keyword,
  };
  if (opts.province) where.province = opts.province;
  if (opts.district) where.district = opts.district;

  const blogs = await prisma.blogPost.findMany({ where, take: 500 });
  const items: PublishingQueue[] = [];

  for (const blog of blogs) {
    items.push(
      await queueContent({
        contentType: "BLOG",
        contentId: blog.id,
        sourcePlanId: opts.sourcePlanId,
        publishMode: opts.publishMode || "AUTOMATIC",
        metadata: {
          province: blog.province,
          district: blog.district,
          geoScope: blog.district ? "district" : "province",
          keyword: opts.keyword,
        },
      })
    );
  }

  return { queued: items.length, items };
}

export async function approveContent(queueId: string): Promise<PublishingQueue> {
  return prisma.publishingQueue.update({
    where: { id: queueId },
    data: { status: "APPROVED" },
  });
}

export async function rejectContent(queueId: string, reason?: string): Promise<PublishingQueue> {
  const item = await prisma.publishingQueue.findUnique({ where: { id: queueId } });
  if (!item) throw new Error("Kuyruk kaydı bulunamadı");
  const meta = parseMeta(item.metadataJson);
  return prisma.publishingQueue.update({
    where: { id: queueId },
    data: {
      status: "REJECTED",
      metadataJson: JSON.stringify({ ...meta, rejectReason: reason || "" }),
    },
  });
}

async function publishContentByType(
  contentType: PublishingContentType,
  contentId: string
): Promise<void> {
  switch (contentType) {
    case "BLOG":
      await publishBlog(contentId);
      break;
    case "PAGE": {
      const page = await prisma.pageFactoryPublishedPage.findUnique({ where: { id: contentId } });
      if (!page) throw new Error("Sayfa bulunamadı");
      await prisma.pageFactoryPublishedPage.update({
        where: { id: contentId },
        data: { status: "PUBLISHED_INTERNAL", publishedAt: new Date() },
      });
      break;
    }
    case "PRODUCT": {
      const product = await prisma.productUniverse.findUnique({ where: { id: contentId } });
      if (!product) throw new Error("Ürün bulunamadı");
      const meta = parseMeta(product.metadataJson);
      await prisma.productUniverse.update({
        where: { id: contentId },
        data: {
          status: "BLUEPRINT_READY",
          metadataJson: JSON.stringify({ ...meta, publishedAt: new Date().toISOString(), published: true }),
        },
      });
      break;
    }
    case "RECOVERY_PAGE": {
      const legacy = await prisma.legacyUrl.findUnique({ where: { id: contentId } });
      if (!legacy) throw new Error("Kurtarma kaydı bulunamadı");
      if (legacy.generatedBlogId) await publishBlog(legacy.generatedBlogId);
      else if (legacy.generatedPageId) {
        await prisma.pageFactoryPublishedPage.update({
          where: { id: legacy.generatedPageId },
          data: { status: "PUBLISHED_INTERNAL", publishedAt: new Date() },
        });
      }
      await prisma.legacyUrl.update({
        where: { id: contentId },
        data: { status: "COMPLETED" },
      });
      break;
    }
    default:
      throw new Error(`Desteklenmeyen içerik tipi: ${contentType}`);
  }
}

async function archiveContentByType(contentType: PublishingContentType, contentId: string): Promise<void> {
  switch (contentType) {
    case "BLOG":
      await archiveBlog(contentId);
      break;
    case "PAGE":
      await prisma.pageFactoryPublishedPage.update({
        where: { id: contentId },
        data: { status: "ARCHIVED" },
      });
      break;
    case "PRODUCT":
      await prisma.productUniverse.update({
        where: { id: contentId },
        data: { status: "REJECTED" },
      });
      break;
    case "RECOVERY_PAGE":
      // Kurtarma kaydı arşivlenir — kuyruk durumu güncellenir
      break;
  }
}

export async function publishNow(queueId: string): Promise<PublishingQueue> {
  const item = await prisma.publishingQueue.findUnique({ where: { id: queueId } });
  if (!item) throw new Error("Kuyruk kaydı bulunamadı");
  if (!["APPROVED", "DRAFT", "SCHEDULED", "REVIEW"].includes(item.status)) {
    throw new Error(`Yayınlanamaz durum: ${item.status}`);
  }

  if (item.status === "REVIEW") {
    const quality = await evaluateQualityForContent(item.contentType, item.contentId);
    if (!quality.passed) {
      throw new Error("Kalite eşiği geçilmedi — önce onaylayın veya içeriği iyileştirin");
    }
  }

  await publishContentByType(item.contentType, item.contentId);

  return prisma.publishingQueue.update({
    where: { id: queueId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
}

export async function schedulePublish(queueId: string, scheduledAt: Date): Promise<PublishingQueue> {
  return prisma.publishingQueue.update({
    where: { id: queueId },
    data: { status: "SCHEDULED", scheduledAt, publishMode: "SCHEDULED" },
  });
}

export async function archiveContent(queueId: string): Promise<PublishingQueue> {
  const item = await prisma.publishingQueue.findUnique({ where: { id: queueId } });
  if (!item) throw new Error("Kuyruk kaydı bulunamadı");

  await archiveContentByType(item.contentType, item.contentId);

  return prisma.publishingQueue.update({
    where: { id: queueId },
    data: { status: "ARCHIVED" },
  });
}

async function runBatch(
  queueIds: string[],
  action: (id: string) => Promise<unknown>
): Promise<BatchResult> {
  const result: BatchResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };
  for (const id of queueIds) {
    result.processed += 1;
    try {
      await action(id);
      result.succeeded += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push(`${id}: ${err instanceof Error ? err.message : "hata"}`);
    }
  }
  return result;
}

export async function publishBatch(queueIds: string[]): Promise<BatchResult> {
  return runBatch(queueIds, (id) => publishNow(id));
}

export async function archiveBatch(queueIds: string[]): Promise<BatchResult> {
  return runBatch(queueIds, (id) => archiveContent(id));
}

export async function approveBatch(queueIds: string[]): Promise<BatchResult> {
  return runBatch(queueIds, (id) => approveContent(id));
}

export async function rejectBatch(queueIds: string[], reason?: string): Promise<BatchResult> {
  return runBatch(queueIds, (id) => rejectContent(id, reason));
}

export async function scheduleBatch(
  queueIds: string[],
  scheduledAt: Date
): Promise<BatchResult> {
  return runBatch(queueIds, (id) => schedulePublish(id, scheduledAt));
}

export async function runPublishingQueue(): Promise<RunQueueResult> {
  const now = new Date();
  const due = await prisma.publishingQueue.findMany({
    where: {
      OR: [
        { status: "SCHEDULED", scheduledAt: { lte: now } },
        { status: "APPROVED", publishMode: "AUTOMATIC" },
      ],
    },
    orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
    take: 100,
  });

  const result: RunQueueResult = { processed: 0, published: 0, failed: 0, errors: [] };

  for (const item of due) {
    result.processed += 1;
    try {
      await publishContentByType(item.contentType, item.contentId);
      await prisma.publishingQueue.update({
        where: { id: item.id },
        data: { status: "PUBLISHED", publishedAt: now },
      });
      result.published += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push(`${item.id}: ${err instanceof Error ? err.message : "hata"}`);
    }
  }

  return result;
}

export async function getPublishingStats(): Promise<PublishingStats> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const [groups, publishedToday, scheduledWeek, qualityAgg, total] = await Promise.all([
    prisma.publishingQueue.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.publishingQueue.count({
      where: { status: "PUBLISHED", publishedAt: { gte: startOfDay } },
    }),
    prisma.publishingQueue.count({
      where: { status: "SCHEDULED", scheduledAt: { gte: now, lte: endOfWeek } },
    }),
    prisma.contentQualityAudit.aggregate({ _avg: { qualityScore: true } }),
    prisma.publishingQueue.count(),
  ]);

  const byStatus: Record<string, number> = {};
  for (const g of groups) byStatus[g.status] = g._count._all;

  const pending =
    (byStatus.DRAFT || 0) +
    (byStatus.REVIEW || 0) +
    (byStatus.APPROVED || 0) +
    (byStatus.SCHEDULED || 0);

  return {
    total,
    draft: byStatus.DRAFT || 0,
    review: byStatus.REVIEW || 0,
    approved: byStatus.APPROVED || 0,
    scheduled: byStatus.SCHEDULED || 0,
    published: byStatus.PUBLISHED || 0,
    archived: byStatus.ARCHIVED || 0,
    rejected: byStatus.REJECTED || 0,
    publishedToday,
    scheduledThisWeek: scheduledWeek,
    avgQuality: Math.round(qualityAgg._avg.qualityScore || 0),
    pending,
  };
}

export async function listQueue(filters?: {
  contentType?: PublishingContentType;
  status?: PublishingQueueStatus;
  limit?: number;
}) {
  return prisma.publishingQueue.findMany({
    where: {
      ...(filters?.contentType ? { contentType: filters.contentType } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: filters?.limit || 100,
  });
}

export async function getPublishingCalendar(days = 30): Promise<CalendarDay[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const items = await prisma.publishingQueue.findMany({
    where: {
      OR: [
        { scheduledAt: { gte: start, lte: end } },
        { publishedAt: { gte: start, lte: end } },
      ],
    },
  });

  const map = new Map<string, CalendarDay>();

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { date: key, blogs: 0, pages: 0, geo: 0, products: 0, recovery: 0, total: 0 });
  }

  for (const item of items) {
    const date = (item.scheduledAt || item.publishedAt)?.toISOString().slice(0, 10);
    if (!date || !map.has(date)) continue;
    const day = map.get(date)!;
    const meta = parseMeta(item.metadataJson);
    const isGeo = !!meta.province || !!meta.geoScope;

    if (item.contentType === "BLOG" && isGeo) day.geo += 1;
    else if (item.contentType === "BLOG") day.blogs += 1;
    else if (item.contentType === "PAGE") day.pages += 1;
    else if (item.contentType === "PRODUCT") day.products += 1;
    else if (item.contentType === "RECOVERY_PAGE") day.recovery += 1;
    day.total += 1;
  }

  return [...map.values()];
}

export async function enrichQueueItems(
  items: PublishingQueue[]
): Promise<Array<PublishingQueue & { title: string; slug?: string }>> {
  const enriched = [];
  for (const item of items) {
    let title = item.contentId;
    let slug: string | undefined;

    if (item.contentType === "BLOG") {
      const post = await prisma.blogPost.findUnique({
        where: { id: item.contentId },
        select: { title: true, slug: true },
      });
      title = post?.title || title;
      slug = post?.slug;
    } else if (item.contentType === "PAGE") {
      const page = await prisma.pageFactoryPublishedPage.findUnique({
        where: { id: item.contentId },
        select: { title: true, slug: true },
      });
      title = page?.title || title;
      slug = page?.slug;
    } else if (item.contentType === "PRODUCT") {
      const product = await prisma.productUniverse.findUnique({
        where: { id: item.contentId },
        select: { normalizedName: true, slug: true },
      });
      title = product?.normalizedName || title;
      slug = product?.slug;
    } else if (item.contentType === "RECOVERY_PAGE") {
      const legacy = await prisma.legacyUrl.findUnique({
        where: { id: item.contentId },
        select: { url: true },
      });
      title = legacy?.url || title;
    }

    enriched.push({ ...item, title, slug });
  }
  return enriched;
}
