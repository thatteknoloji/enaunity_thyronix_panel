import { prisma } from "@/lib/db";
import type { Job, JobLog, JobPriority, JobStatus, JobType, Prisma } from "@prisma/client";
import {
  JOB_DEFAULT_MAX_RETRY,
  JOB_HEARTBEAT_TIMEOUT_SEC,
  PRIORITY_ORDER,
} from "./constants";

export type CreateJobInput = {
  jobType: JobType;
  entityType?: string;
  entityId?: string;
  priority?: JobPriority;
  totalSteps?: number;
  createdBy?: string;
  maxRetry?: number;
  metadata?: Record<string, unknown>;
};

export type JobProgressUpdate = {
  progress?: number;
  completedSteps?: number;
  totalSteps?: number;
  currentStep?: string;
  currentMessage?: string;
  estimatedRemainingSeconds?: number;
};

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const job = await prisma.job.create({
    data: {
      jobType: input.jobType,
      entityType: input.entityType || "",
      entityId: input.entityId || "",
      priority: input.priority || "NORMAL",
      totalSteps: input.totalSteps || 0,
      createdBy: input.createdBy || "",
      maxRetry: input.maxRetry ?? JOB_DEFAULT_MAX_RETRY,
      status: "WAITING",
      metadataJson: JSON.stringify(input.metadata || {}),
      currentMessage: "Kuyrukta bekliyor",
    },
  });
  await appendLog(job.id, "INFO", "Görev oluşturuldu ve kuyruğa alındı");
  return job;
}

export async function startJob(jobId: string): Promise<Job> {
  const now = new Date();
  return prisma.job.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: now,
      lastHeartbeat: now,
      errorMessage: "",
      currentMessage: "Görev başlatıldı",
    },
  });
}

export async function finishJob(jobId: string, result?: Record<string, unknown>): Promise<Job> {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      finishedAt: new Date(),
      progress: 100,
      currentStep: "Tamamlandı",
      currentMessage: "Tamamlandı",
      estimatedRemainingSeconds: 0,
      resultJson: JSON.stringify(result || {}),
    },
  });
  await appendLog(jobId, "INFO", "Görev tamamlandı");
  return job;
}

export async function failJob(jobId: string, errorMessage: string): Promise<Job> {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      errorMessage,
      currentMessage: errorMessage,
    },
  });
  await appendLog(jobId, "ERROR", errorMessage);
  return job;
}

export async function cancelJob(jobId: string, reason = "İptal edildi"): Promise<Job> {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "CANCELLED",
      finishedAt: new Date(),
      currentMessage: reason,
      errorMessage: reason,
    },
  });
  await appendLog(jobId, "WARN", reason);
  return job;
}

export async function pauseJob(jobId: string): Promise<Job> {
  const job = await prisma.job.update({
    where: { id: jobId, status: "RUNNING" },
    data: { status: "PAUSED", currentMessage: "Duraklatıldı" },
  });
  await appendLog(jobId, "INFO", "Görev duraklatıldı");
  return job;
}

export async function resumeJob(jobId: string): Promise<Job> {
  const now = new Date();
  const job = await prisma.job.update({
    where: { id: jobId, status: "PAUSED" },
    data: {
      status: "WAITING",
      lastHeartbeat: now,
      currentMessage: "Kuyruğa geri alındı",
      startedAt: null,
      finishedAt: null,
    },
  });
  await appendLog(jobId, "INFO", "Görev devam etmek üzere kuyruğa alındı");
  return job;
}

export async function updateProgress(jobId: string, update: JobProgressUpdate): Promise<Job> {
  const data: Prisma.JobUpdateInput = {
    lastHeartbeat: new Date(),
  };
  if (update.progress !== undefined) data.progress = update.progress;
  if (update.completedSteps !== undefined) data.completedSteps = update.completedSteps;
  if (update.totalSteps !== undefined) data.totalSteps = update.totalSteps;
  if (update.currentStep !== undefined) data.currentStep = update.currentStep;
  if (update.currentMessage !== undefined) data.currentMessage = update.currentMessage;
  if (update.estimatedRemainingSeconds !== undefined) {
    data.estimatedRemainingSeconds = update.estimatedRemainingSeconds;
  }
  return prisma.job.update({ where: { id: jobId }, data });
}

export async function appendLog(
  jobId: string,
  level: string,
  message: string
): Promise<JobLog> {
  return prisma.jobLog.create({
    data: { jobId, level, message },
  });
}

export async function heartbeat(jobId: string): Promise<void> {
  await prisma.job.update({
    where: { id: jobId, status: "RUNNING" },
    data: { lastHeartbeat: new Date() },
  });
}

export async function retryJob(jobId: string): Promise<Job> {
  const existing = await prisma.job.findUnique({ where: { id: jobId } });
  if (!existing) throw new Error("Görev bulunamadı");
  if (existing.retryCount >= existing.maxRetry) {
    throw new Error("Maksimum deneme sayısına ulaşıldı");
  }
  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "WAITING",
      retryCount: existing.retryCount + 1,
      errorMessage: "",
      progress: 0,
      completedSteps: 0,
      startedAt: null,
      finishedAt: null,
      currentMessage: `Yeniden deneme (${existing.retryCount + 1}/${existing.maxRetry})`,
    },
  });
  await appendLog(jobId, "INFO", `Yeniden deneme #${job.retryCount}`);
  return job;
}

export async function getJob(jobId: string) {
  return prisma.job.findUnique({
    where: { id: jobId },
    include: { logs: { orderBy: { createdAt: "asc" }, take: 200 } },
  });
}

export async function listJobs(filters?: {
  status?: JobStatus | JobStatus[];
  jobType?: JobType;
  limit?: number;
  offset?: number;
}) {
  const statusFilter = filters?.status
    ? Array.isArray(filters.status)
      ? { in: filters.status }
      : filters.status
    : undefined;

  return prisma.job.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(filters?.jobType ? { jobType: filters.jobType } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: filters?.limit || 100,
    skip: filters?.offset || 0,
    include: { logs: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
}

export async function failStaleRunningJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - JOB_HEARTBEAT_TIMEOUT_SEC * 1000);
  const stale = await prisma.job.findMany({
    where: {
      status: "RUNNING",
      OR: [{ lastHeartbeat: { lt: cutoff } }, { lastHeartbeat: null }],
    },
    take: 50,
  });

  for (const job of stale) {
    await failJob(job.id, `Heartbeat zaman aşımı (${JOB_HEARTBEAT_TIMEOUT_SEC}s)`);
  }
  return stale.length;
}

export async function claimWaitingJobs(limit: number): Promise<Job[]> {
  const waiting = await prisma.job.findMany({
    where: { status: "WAITING" },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: limit * 3,
  });

  waiting.sort(
    (a, b) =>
      PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority] ||
      a.createdAt.getTime() - b.createdAt.getTime()
  );

  const claimed: Job[] = [];
  for (const job of waiting.slice(0, limit)) {
    const updated = await prisma.job.updateMany({
      where: { id: job.id, status: "WAITING" },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        lastHeartbeat: new Date(),
        currentMessage: "Çalışıyor",
      },
    });
    if (updated.count === 1) {
      const fresh = await prisma.job.findUnique({ where: { id: job.id } });
      if (fresh) claimed.push(fresh);
    }
  }
  return claimed;
}

export async function getJobDashboardStats() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [active, waiting, completed24h, failed24h, retryWaiting, lastFailed] = await Promise.all([
    prisma.job.count({ where: { status: "RUNNING" } }),
    prisma.job.count({ where: { status: "WAITING" } }),
    prisma.job.findMany({
      where: { status: "COMPLETED", finishedAt: { gte: dayAgo } },
      select: { startedAt: true, finishedAt: true },
    }),
    prisma.job.count({ where: { status: "FAILED", finishedAt: { gte: dayAgo } } }),
    prisma.job.count({ where: { status: "WAITING", retryCount: { gt: 0 } } }),
    prisma.job.findFirst({
      where: { status: "FAILED" },
      orderBy: { finishedAt: "desc" },
      select: { id: true, jobType: true, errorMessage: true, finishedAt: true },
    }),
  ]);

  const durations = completed24h
    .filter((j) => j.startedAt && j.finishedAt)
    .map((j) => j.finishedAt!.getTime() - j.startedAt!.getTime());
  const avgDurationMs =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const total24h = completed24h.length + failed24h;
  const successRate = total24h > 0 ? Math.round((completed24h.length / total24h) * 100) : 100;

  return {
    active,
    waiting,
    avgDurationSeconds: Math.round(avgDurationMs / 1000),
    successRate,
    lastError: lastFailed,
    retryWaiting,
    cpuWaiting: waiting + active,
  };
}

export function getJobMetadata<T extends Record<string, unknown>>(job: Job): T {
  return parseJson<T>(job.metadataJson, {} as T);
}
