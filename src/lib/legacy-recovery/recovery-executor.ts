import { prisma } from "@/lib/db";
import { generateKeywordBlog } from "@/lib/blog-engine/blog-service";
import { processLegacyRecoveryThroughPipeline } from "@/lib/content-operations/content-pipeline-service";
import { generateContentDraftForBlueprint } from "@/lib/page-factory/content-draft/content-draft-service";
import { normalizeLegacyUrl, extractKeywordFromPath, extractPathSlug } from "./url-normalizer";
import type { LegacyBulkResult } from "./types";
import type { LegacyUrl } from "@prisma/client";

const RECOVERY_PROJECT_SLUG = "legacy-recovery-v1";

async function getOrCreateRecoveryProject(projectId?: string | null) {
  if (projectId) {
    const existing = await prisma.pageFactoryProject.findUnique({ where: { id: projectId } });
    if (existing) return existing;
  }

  const bySlug = await prisma.pageFactoryProject.findFirst({
    where: { slug: RECOVERY_PROJECT_SLUG },
  });
  if (bySlug) return bySlug;

  return prisma.pageFactoryProject.create({
    data: {
      name: "Link Kurtarma Merkezi",
      slug: RECOVERY_PROJECT_SLUG,
      sector: "legacy-recovery",
      country: "TR",
      language: "tr",
      productionType: "SEO",
      status: "active",
      metadataJson: JSON.stringify({ source: "LEGACY_RECOVERY_V1" }),
    },
  });
}

async function recoverAsBlog(item: LegacyUrl): Promise<string> {
  const keyword = extractKeywordFromPath(item.normalizedUrl);
  const result = await generateKeywordBlog({
    keyword,
    projectId: item.projectId,
    autoPublish: false,
  });
  if (!result.postId) throw new Error("Blog oluşturulamadı");
  return result.postId;
}

async function recoverAsPage(item: LegacyUrl): Promise<string> {
  const project = await getOrCreateRecoveryProject(item.projectId);
  const slug = extractPathSlug(item.normalizedUrl);
  const title = extractKeywordFromPath(item.normalizedUrl);

  const blueprint = await prisma.pageFactoryBlueprint.create({
    data: {
      projectId: project.id,
      title: `${title} — Kurtarma Sayfası`,
      pageType: "LANDING",
      hierarchyLevel: 1,
      clusterPath: "/legacy-recovery",
      metadataJson: JSON.stringify({
        legacyUrlId: item.id,
        recovery: true,
        slug,
        generationSource: "LEGACY_RECOVERY",
      }),
    },
  });

  const draft = await generateContentDraftForBlueprint(blueprint.id);
  if (!draft.draftId) throw new Error("Sayfa taslağı oluşturulamadı");
  return draft.draftId;
}

async function createRedirectRule(item: LegacyUrl): Promise<void> {
  const sourceUrl = normalizeLegacyUrl(item.url);
  const targetUrl = item.suggestedTargetUrl || "/";
  await prisma.legacyRedirectRule.upsert({
    where: { sourceUrl },
    create: {
      sourceUrl,
      targetUrl,
      statusCode: 301,
      enabled: true,
      legacyUrlId: item.id,
    },
    update: {
      targetUrl,
      enabled: true,
      legacyUrlId: item.id,
    },
  });
}

async function createGoneRule(item: LegacyUrl): Promise<void> {
  const url = normalizeLegacyUrl(item.url);
  await prisma.legacyGoneRule.upsert({
    where: { url },
    create: {
      url,
      reason: item.notes || "Legacy recovery — süresi dolmuş içerik",
      enabled: true,
      legacyUrlId: item.id,
    },
    update: {
      enabled: true,
      legacyUrlId: item.id,
    },
  });
}

export async function executeLegacyRecovery(
  item: LegacyUrl,
  opts?: { skipPipeline?: boolean; autoPublish?: boolean }
): Promise<LegacyUrl> {
  let generatedBlogId = item.generatedBlogId;
  let generatedPageId = item.generatedPageId;
  let status: LegacyUrl["status"] = "COMPLETED";

  switch (item.recoveryStrategy) {
    case "CREATE_BLOG":
      generatedBlogId = await recoverAsBlog(item);
      status = "GENERATED";
      break;
    case "CREATE_PAGE":
      generatedPageId = await recoverAsPage(item);
      status = "GENERATED";
      break;
    case "REDIRECT_301":
      await createRedirectRule(item);
      break;
    case "GONE_410":
      await createGoneRule(item);
      break;
    case "IGNORE":
      status = "COMPLETED";
      break;
  }

  const updated = await prisma.legacyUrl.update({
    where: { id: item.id },
    data: {
      status,
      generatedBlogId,
      generatedPageId,
    },
  });

  if (!opts?.skipPipeline && (generatedBlogId || generatedPageId)) {
    try {
      await processLegacyRecoveryThroughPipeline(updated.id, {
        autoPublish: opts?.autoPublish !== false,
      });
    } catch {
      /* Pipeline hatası kurtarma kaydını geri almaz */
    }
  }

  return updated;
}

export async function generateLegacyRecoveries(opts?: {
  projectId?: string | null;
  limit?: number;
}): Promise<LegacyBulkResult> {
  const limit = opts?.limit || 500;
  const urls = await prisma.legacyUrl.findMany({
    where: {
      status: "PLANNED",
      recoveryStrategy: { not: "IGNORE" },
      ...(opts?.projectId ? { projectId: opts.projectId } : {}),
    },
    take: limit,
  });

  const result: LegacyBulkResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  for (const item of urls) {
    result.processed++;
    try {
      await executeLegacyRecovery(item);
      result.succeeded++;
    } catch (e) {
      result.failed++;
      result.errors.push(`${item.url}: ${e instanceof Error ? e.message : "Hata"}`);
    }
  }

  return result;
}

export async function listRedirectRules() {
  return prisma.legacyRedirectRule.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listGoneRules() {
  return prisma.legacyGoneRule.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getActiveLegacyRedirectRules() {
  return prisma.legacyRedirectRule.findMany({
    where: { enabled: true },
    select: { sourceUrl: true, targetUrl: true, statusCode: true },
  });
}

export async function getActiveLegacyGoneRules() {
  return prisma.legacyGoneRule.findMany({
    where: { enabled: true },
    select: { url: true },
  });
}

export async function createRedirectRuleManual(sourceUrl: string, targetUrl: string, statusCode = 301) {
  return prisma.legacyRedirectRule.upsert({
    where: { sourceUrl: normalizeLegacyUrl(sourceUrl) },
    create: {
      sourceUrl: normalizeLegacyUrl(sourceUrl),
      targetUrl,
      statusCode,
      enabled: true,
    },
    update: { targetUrl, statusCode, enabled: true },
  });
}

export async function createGoneRuleManual(url: string, reason: string) {
  return prisma.legacyGoneRule.upsert({
    where: { url: normalizeLegacyUrl(url) },
    create: {
      url: normalizeLegacyUrl(url),
      reason,
      enabled: true,
    },
    update: { reason, enabled: true },
  });
}
