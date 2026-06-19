import { prisma } from "@/lib/db";
import { loadPreview, deletePreview } from "./preview-store";
import { commitImport } from "./upsert-engine";
import type { CategoryMapping, GroupedProduct } from "./types";

const CHUNK_SIZE = 25;
const ASYNC_THRESHOLD = 100;

export function shouldQueueImport(groupCount: number): boolean {
  return groupCount >= ASYNC_THRESHOLD;
}

export async function queueImportJob(
  previewJobId: string,
  categoryMapping: CategoryMapping,
): Promise<{ jobId: string; queued: boolean; groupCount: number }> {
  const stored = await loadPreview(previewJobId);
  if (!stored?.groups?.length) throw new Error("Önizleme bulunamadı");

  await prisma.productImportJob.update({
    where: { id: previewJobId },
    data: {
      status: "QUEUED",
      productCount: stored.groups.length,
      mappingJson: JSON.stringify({ categoryMapping, cursor: 0, productIds: [], errors: [] }),
      startedAt: new Date(),
    },
  });

  return { jobId: previewJobId, queued: true, groupCount: stored.groups.length };
}

export async function processImportJobChunk(jobId: string, chunkSize = CHUNK_SIZE): Promise<{
  done: boolean;
  progress: number;
  total: number;
  status: string;
}> {
  const job = await prisma.productImportJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job bulunamadı");
  if (job.status === "COMPLETED" || job.status === "FAILED") {
    const report = JSON.parse(job.reportJson || "{}");
    return { done: true, progress: report.progress || job.productCount, total: job.productCount, status: job.status };
  }

  const stored = await loadPreview(jobId);
  if (!stored?.groups?.length) {
    await prisma.productImportJob.update({
      where: { id: jobId },
      data: { status: "FAILED", errorMessage: "Preview dosyası bulunamadı", completedAt: new Date() },
    });
    throw new Error("Preview dosyası bulunamadı");
  }

  let meta: { categoryMapping?: CategoryMapping; cursor?: number; productIds?: string[]; errors?: string[] } = {};
  try {
    meta = JSON.parse(job.mappingJson || "{}");
  } catch { /* ignore */ }

  const cursor = meta.cursor || 0;
  const categoryMapping = meta.categoryMapping || {};
  const groups = stored.groups as GroupedProduct[];
  const slice = groups.slice(cursor, cursor + chunkSize);

  if (job.status === "QUEUED") {
    await prisma.productImportJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });
  }

  if (slice.length === 0) {
    await prisma.productImportJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        reportJson: JSON.stringify({
          progress: groups.length,
          total: groups.length,
          productIds: meta.productIds || [],
          errors: (meta.errors || []).slice(0, 100),
        }),
      },
    });
    await deletePreview(jobId);
    return { done: true, progress: groups.length, total: groups.length, status: "COMPLETED" };
  }

  const result = await commitImport(slice, categoryMapping, {
    fileName: stored.fileName,
    preset: stored.preset,
    jobId,
    skipJobFinalize: true,
  });

  const nextCursor = cursor + slice.length;
  const productIds = [...(meta.productIds || []), ...result.productIds];
  const errors = [...(meta.errors || []), ...result.errors];

  const done = nextCursor >= groups.length;

  await prisma.productImportJob.update({
    where: { id: jobId },
    data: {
      status: done ? "COMPLETED" : "RUNNING",
      addedCount: (job.addedCount || 0) + result.created,
      updatedCount: (job.updatedCount || 0) + result.updated,
      unchangedCount: (job.unchangedCount || 0) + result.skipped,
      mappingJson: JSON.stringify({ categoryMapping, cursor: nextCursor, productIds, errors }),
      reportJson: JSON.stringify({ progress: nextCursor, total: groups.length, productIds, errors: errors.slice(0, 100) }),
      completedAt: done ? new Date() : undefined,
      durationMs: done ? Date.now() - (job.startedAt?.getTime() || Date.now()) : job.durationMs,
    },
  });

  if (done) await deletePreview(jobId);

  return { done, progress: nextCursor, total: groups.length, status: done ? "COMPLETED" : "RUNNING" };
}

export async function runPendingImportJobs(maxJobs = 3): Promise<{ processed: number; results: unknown[] }> {
  const pending = await prisma.productImportJob.findMany({
    where: { status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: { createdAt: "asc" },
    take: maxJobs,
  });

  const results = [];
  for (const job of pending) {
    let done = false;
    let guard = 0;
    while (!done && guard < 200) {
      const r = await processImportJobChunk(job.id);
      done = r.done;
      results.push({ jobId: job.id, ...r });
      guard++;
    }
  }
  return { processed: pending.length, results };
}
