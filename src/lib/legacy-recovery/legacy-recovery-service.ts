import { prisma } from "@/lib/db";
import type { LegacyUrl } from "@prisma/client";
import { classifyLegacyUrl } from "./url-classifier";
import { planLegacyRecovery } from "./recovery-planner";
import { dedupeImportRows, parseLegacyUrlImport } from "./url-importer";
import { normalizeLegacyUrl } from "./url-normalizer";
import type { LegacyBulkResult, LegacyRecoveryStats, LegacyUrlImportRow } from "./types";

export async function importLegacyUrls(opts: {
  format: "csv" | "txt" | "sitemap" | "manual";
  content?: string;
  urls?: string[];
  source?: string;
  projectId?: string | null;
}): Promise<{ imported: number; skipped: number; total: number }> {
  const rows = dedupeImportRows(
    parseLegacyUrlImport({
      format: opts.format,
      content: opts.content || "",
      urls: opts.urls,
      source: opts.source,
    })
  );

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const normalizedUrl = normalizeLegacyUrl(row.url);
    try {
      await prisma.legacyUrl.create({
        data: {
          projectId: opts.projectId || null,
          url: row.url.trim(),
          normalizedUrl,
          source: row.source || opts.source || "import",
          lastmod: row.lastmod ? new Date(row.lastmod) : null,
          status: "IMPORTED",
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped, total: rows.length };
}

export async function analyzeLegacyUrls(opts?: {
  projectId?: string | null;
  limit?: number;
}): Promise<LegacyBulkResult> {
  const limit = opts?.limit || 1000;
  const urls = await prisma.legacyUrl.findMany({
    where: {
      status: "IMPORTED",
      ...(opts?.projectId ? { projectId: opts.projectId } : {}),
    },
    take: limit,
  });

  const result: LegacyBulkResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  for (const item of urls) {
    result.processed++;
    try {
      const classification = classifyLegacyUrl(item.url);
      await prisma.legacyUrl.update({
        where: { id: item.id },
        data: {
          status: "ANALYZED",
          classification: classification.classification,
          confidenceScore: classification.confidenceScore,
          notes: classification.notes,
        },
      });
      result.succeeded++;
    } catch (e) {
      result.failed++;
      result.errors.push(e instanceof Error ? e.message : "Analiz hatası");
    }
  }

  return result;
}

export async function planLegacyUrls(opts?: {
  projectId?: string | null;
  limit?: number;
}): Promise<LegacyBulkResult> {
  const limit = opts?.limit || 1000;
  const urls = await prisma.legacyUrl.findMany({
    where: {
      status: "ANALYZED",
      ...(opts?.projectId ? { projectId: opts.projectId } : {}),
    },
    take: limit,
  });

  const result: LegacyBulkResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  for (const item of urls) {
    result.processed++;
    try {
      const classification = classifyLegacyUrl(item.url);
      const plan = planLegacyRecovery(item.url, classification);
      await prisma.legacyUrl.update({
        where: { id: item.id },
        data: {
          status: "PLANNED",
          recoveryStrategy: plan.strategy,
          confidenceScore: plan.confidenceScore,
          suggestedTargetUrl: plan.suggestedTargetUrl,
          notes: plan.notes,
        },
      });
      result.succeeded++;
    } catch (e) {
      result.failed++;
      result.errors.push(e instanceof Error ? e.message : "Plan hatası");
    }
  }

  return result;
}

export async function listLegacyUrls(filters: {
  status?: string;
  strategy?: string;
  page?: number;
  limit?: number;
  projectId?: string | null;
}) {
  const page = filters.page || 1;
  const limit = Math.min(100, filters.limit || 50);
  const where = {
    ...(filters.status ? { status: filters.status as LegacyUrl["status"] } : {}),
    ...(filters.strategy
      ? { recoveryStrategy: filters.strategy as LegacyUrl["recoveryStrategy"] }
      : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.legacyUrl.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.legacyUrl.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getLegacyRecoveryStats(projectId?: string | null): Promise<LegacyRecoveryStats> {
  const where = projectId ? { projectId } : {};
  const [
    total,
    imported,
    analyzed,
    planned,
    generated,
    completed,
    blogRecovery,
    pageRecovery,
    redirect301,
    gone410,
  ] = await Promise.all([
    prisma.legacyUrl.count({ where }),
    prisma.legacyUrl.count({ where: { ...where, status: "IMPORTED" } }),
    prisma.legacyUrl.count({ where: { ...where, status: "ANALYZED" } }),
    prisma.legacyUrl.count({ where: { ...where, status: "PLANNED" } }),
    prisma.legacyUrl.count({ where: { ...where, status: "GENERATED" } }),
    prisma.legacyUrl.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.legacyUrl.count({ where: { ...where, recoveryStrategy: "CREATE_BLOG" } }),
    prisma.legacyUrl.count({ where: { ...where, recoveryStrategy: "CREATE_PAGE" } }),
    prisma.legacyUrl.count({ where: { ...where, recoveryStrategy: "REDIRECT_301" } }),
    prisma.legacyUrl.count({ where: { ...where, recoveryStrategy: "GONE_410" } }),
  ]);

  return {
    total,
    imported,
    analyzed,
    planned,
    generated,
    completed,
    blogRecovery,
    pageRecovery,
    redirect301,
    gone410,
    pending: imported + analyzed + planned,
  };
}

export async function getGeneratedContent(projectId?: string | null) {
  return prisma.legacyUrl.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      OR: [{ generatedBlogId: { not: null } }, { generatedPageId: { not: null } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}
