import type { Job } from "@prisma/client";
import {
  generateCategoryBlog,
  generateCompetitorStructureBlog,
  generateGeoBlog,
  generateKeywordBlog,
  generateKeywordGroupBlogs,
  generateProductBlog,
  publishBlog,
} from "@/lib/blog-engine/blog-service";
import type { BlogSourceType, ProductBlogType } from "@/lib/blog-engine/blog-types";
import { BLOG_ENGINE_VERSION, type BlogContentPayload } from "@/lib/blog-engine/blog-types";
import { runBlogQualityCheck } from "@/lib/blog-engine/blog-quality";
import { previewGeoGeneration, startGeoJob } from "@/lib/geo-content-factory/geo-content-factory-service";
import type { GeoGenerationMode } from "@/lib/geo-content-factory/types";
import { generateLegacyRecoveries } from "@/lib/legacy-recovery/recovery-executor";
import { generatePageFactoryPlan } from "@/lib/page-factory/project-service";
import { generateBulkContentDrafts } from "@/lib/page-factory/content-draft/content-draft-service";
import { publishBatch } from "@/lib/publishing-center/publishing-service";
import {
  rewriteThinContent,
  validateGeneratedContent,
} from "@/lib/ai-writer/ai-content-writer";
import { isPublishableAiContent } from "@/lib/ai-writer/publish-gate";
import { auditBlog } from "@/lib/content-quality/content-quality-service";
import { prisma } from "@/lib/db";
import { PROGRESS_STEPS } from "./constants";
import {
  appendLog,
  finishJob,
  getJobMetadata,
  updateProgress,
} from "./job-service";

export type JobExecutionContext = {
  jobId: string;
  signalHeartbeat: () => Promise<void>;
};

async function step(
  ctx: JobExecutionContext,
  update: {
    progress: number;
    currentStep: string;
    currentMessage: string;
    completedSteps?: number;
    totalSteps?: number;
  }
) {
  await updateProgress(ctx.jobId, update);
  await ctx.signalHeartbeat();
  await appendLog(ctx.jobId, "INFO", update.currentMessage);
}

async function handleGeoGeneration(job: Job, ctx: JobExecutionContext) {
  const meta = getJobMetadata<{
    keyword: string;
    keywordGroup?: string;
    category?: string;
    mode: GeoGenerationMode;
    autoPublish?: boolean;
    provinces?: string[];
  }>(job);

  const preview = previewGeoGeneration({
    keyword: meta.keyword,
    mode: meta.mode,
    settings: { provinces: meta.provinces },
  });

  await step(ctx, {
    progress: 0,
    currentStep: PROGRESS_STEPS.PREPARING,
    currentMessage: `${preview.totalTargets} hedef için GEO üretimi hazırlanıyor`,
    totalSteps: preview.totalTargets,
    completedSteps: 0,
  });

  const { job: geoJob, result } = await startGeoJob({
    keyword: meta.keyword,
    keywordGroup: meta.keywordGroup,
    category: meta.category,
    mode: meta.mode,
    autoPublish: meta.autoPublish,
    provinces: meta.provinces,
    onProgress: async (completed, total, message) => {
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      await step(ctx, {
        progress: Math.min(99, pct),
        currentStep: PROGRESS_STEPS.AI_WRITING,
        currentMessage: `GEO: ${message} (${completed}/${total})`,
        completedSteps: completed,
        totalSteps: total,
      });
    },
  });

  await finishJob(ctx.jobId, { geoJobId: geoJob.id, ...result });
}

async function handleBlogGeneration(job: Job, ctx: JobExecutionContext) {
  const meta = getJobMetadata<{
    sourceType: BlogSourceType;
    keyword?: string;
    keywords?: string[];
    keywordGroup?: string;
    productId?: string;
    productBlogType?: ProductBlogType;
    category?: string;
    province?: string;
    district?: string;
    competitorStructure?: string;
    competitorUrl?: string;
    tags?: string[];
    autoPublish?: boolean;
    projectId?: string;
  }>(job);

  await step(ctx, {
    progress: 5,
    currentStep: PROGRESS_STEPS.PREPARING,
    currentMessage: "Blog üretimi hazırlanıyor",
    totalSteps: 6,
    completedSteps: 0,
  });

  const opts = {
    keyword: meta.keyword,
    keywords: meta.keywords,
    keywordGroup: meta.keywordGroup,
    productId: meta.productId,
    productBlogType: meta.productBlogType,
    category: meta.category,
    province: meta.province,
    district: meta.district,
    competitorStructure: meta.competitorStructure,
    competitorUrl: meta.competitorUrl,
    tags: meta.tags,
    autoPublish: meta.autoPublish,
    projectId: meta.projectId,
  };

  await step(ctx, {
    progress: 20,
    currentStep: PROGRESS_STEPS.AI_WRITING,
    currentMessage: "AI içerik yazılıyor",
    completedSteps: 1,
  });

  let data: unknown;
  switch (meta.sourceType) {
    case "KEYWORD":
      data = await generateKeywordBlog(opts);
      break;
    case "KEYWORD_GROUP":
      data = await generateKeywordGroupBlogs(opts);
      break;
    case "PRODUCT":
      data = await generateProductBlog(opts);
      break;
    case "CATEGORY":
      data = await generateCategoryBlog(opts);
      break;
    case "GEO":
      data = await generateGeoBlog(opts);
      break;
    case "COMPETITOR_STRUCTURE":
      data = await generateCompetitorStructureBlog(opts);
      break;
    default:
      throw new Error(`Desteklenmeyen sourceType: ${meta.sourceType}`);
  }

  await step(ctx, {
    progress: 90,
    currentStep: PROGRESS_STEPS.SAVING,
    currentMessage: "Blog kaydedildi",
    completedSteps: 5,
  });

  await finishJob(ctx.jobId, { result: data });
}

async function handlePageGeneration(job: Job, ctx: JobExecutionContext) {
  const meta = getJobMetadata<{ projectId: string }>(job);
  await step(ctx, {
    progress: 10,
    currentStep: PROGRESS_STEPS.PREPARING,
    currentMessage: "Sayfa planı hazırlanıyor",
  });
  await step(ctx, {
    progress: 40,
    currentStep: PROGRESS_STEPS.AI_WRITING,
    currentMessage: "Sayfa içeriği üretiliyor",
  });
  const updated = await generatePageFactoryPlan(meta.projectId);
  await generateBulkContentDrafts(meta.projectId, { limit: 20, dryRun: false }, true);
  await finishJob(ctx.jobId, { projectId: meta.projectId, plan: updated });
}

async function handleRecoveryGeneration(job: Job, ctx: JobExecutionContext) {
  const meta = getJobMetadata<{ projectId?: string; limit?: number }>(job);
  const limit = meta.limit || 500;
  await step(ctx, {
    progress: 5,
    currentStep: PROGRESS_STEPS.PREPARING,
    currentMessage: `${limit} URL için kurtarma başlatılıyor`,
    totalSteps: limit,
  });
  const result = await generateLegacyRecoveries({
    projectId: meta.projectId || null,
    limit,
  });
  await finishJob(ctx.jobId, result);
}

async function handleAiRewrite(job: Job, ctx: JobExecutionContext) {
  const meta = getJobMetadata<{ slug: string; autoPublish?: boolean }>(job);
  const slug = meta.slug;
  const post = await prisma.blogPost.findFirst({ where: { slug } });
  if (!post) throw new Error(`Blog bulunamadı: ${slug}`);

  const existingContent = JSON.parse(post.contentJson || "{}") as BlogContentPayload;
  const plainText = [
    existingContent.h1,
    existingContent.intro,
    ...existingContent.sections.map((s) => `${s.heading}\n${s.body}`),
    existingContent.conclusion,
  ].join("\n\n");

  const backup = {
    backedUpAt: new Date().toISOString(),
    reason: "pre_rewriteThinContent_v1",
    title: post.title,
    contentJson: post.contentJson,
    status: post.status,
  };

  await step(ctx, {
    progress: 10,
    currentStep: PROGRESS_STEPS.PREPARING,
    currentMessage: "Mevcut içerik yedeklendi",
  });

  await step(ctx, {
    progress: 30,
    currentStep: PROGRESS_STEPS.AI_WRITING,
    currentMessage: "AI rewriteThinContent çalışıyor",
  });

  const rewrite = await rewriteThinContent({
    title: post.title,
    content: plainText,
    keyword: post.keyword || post.title,
    contentType: "BLOG",
  });

  if (!rewrite.success || !rewrite.data) {
    throw new Error(rewrite.error || rewrite.metadata.generationError || "Rewrite başarısız");
  }

  const out = rewrite.data;
  const validation = validateGeneratedContent({
    contentType: "BLOG",
    h1: out.content.h1,
    intro: out.content.intro,
    sections: out.content.sections,
    conclusion: out.content.conclusion,
    faq: out.faq,
    seoTitle: out.seoTitle,
    seoDescription: out.seoDescription,
    schema: out.schema,
    keyword: post.keyword,
  });

  await step(ctx, {
    progress: 60,
    currentStep: PROGRESS_STEPS.QUALITY,
    currentMessage: "Kalite denetleniyor",
  });

  const blogQuality = runBlogQualityCheck({
    content: out.content,
    faq: out.faq,
    seoTitle: out.seoTitle,
    seoDescription: out.seoDescription,
    schema: out.schema,
    keyword: post.keyword,
    originalityHint: 95,
  });

  const existingMeta = JSON.parse(post.metadataJson || "{}") as Record<string, unknown>;
  await prisma.blogPost.update({
    where: { id: post.id },
    data: {
      title: out.title,
      excerpt: out.excerpt,
      contentJson: JSON.stringify(out.content),
      faqJson: JSON.stringify(out.faq),
      schemaJson: JSON.stringify(out.schema),
      seoTitle: out.seoTitle,
      seoDescription: out.seoDescription,
      qualityScore: blogQuality.qualityScore,
      seoScore: blogQuality.seoScore,
      geoScore: blogQuality.geoScore,
      originalityScore: blogQuality.originalityScore,
      status: "REVIEW",
      metadataJson: JSON.stringify({
        ...existingMeta,
        preRewriteBackup: existingMeta.preRewriteBackup || backup,
        aiWriter: rewrite.metadata,
        aiBrain: {
          brainVersion: "ENA_AKILLI_ICERIK_BEYNI_V2",
          qualityIssues: rewrite.metadata.validationIssues || [],
          provider: rewrite.metadata.provider,
          model: rewrite.metadata.model,
          wordCount: rewrite.metadata.wordCount,
          generationStatus: rewrite.metadata.generationStatus,
        },
        thinContentRewrite: true,
      }),
    },
  });

  await auditBlog(post.id);

  const aiGate = isPublishableAiContent(rewrite.metadata);
  let published = false;
  if (
    meta.autoPublish &&
    validation.passed &&
    blogQuality.passed &&
    aiGate.publishable
  ) {
    await step(ctx, {
      progress: 90,
      currentStep: PROGRESS_STEPS.QUEUE,
      currentMessage: "Yayınlanıyor",
    });
    await publishBlog(post.id);
    published = true;
  }

  await finishJob(ctx.jobId, {
    slug,
    postId: post.id,
    published,
    wordCount: validation.wordCount,
    validationPassed: validation.passed,
  });
}

async function handleBatchPublish(job: Job, ctx: JobExecutionContext) {
  const meta = getJobMetadata<{ queueIds: string[] }>(job);
  const ids = meta.queueIds || [];
  await step(ctx, {
    progress: 10,
    currentStep: PROGRESS_STEPS.PREPARING,
    currentMessage: `${ids.length} öğe yayınlanacak`,
    totalSteps: ids.length,
  });
  const result = await publishBatch(ids);
  await finishJob(ctx.jobId, result);
}

export async function executeJob(job: Job, ctx: JobExecutionContext): Promise<void> {
  switch (job.jobType) {
    case "GEO_GENERATION":
      return handleGeoGeneration(job, ctx);
    case "BLOG_GENERATION":
      return handleBlogGeneration(job, ctx);
    case "PAGE_GENERATION":
      return handlePageGeneration(job, ctx);
    case "RECOVERY_GENERATION":
      return handleRecoveryGeneration(job, ctx);
    case "AI_REWRITE":
      return handleAiRewrite(job, ctx);
    case "BATCH_PUBLISH":
      return handleBatchPublish(job, ctx);
    default:
      throw new Error(`Henüz desteklenmeyen jobType: ${job.jobType}`);
  }
}
