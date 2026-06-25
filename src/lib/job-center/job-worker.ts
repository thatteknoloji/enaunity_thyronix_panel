import type { Job } from "@prisma/client";
import {
  JOB_HEARTBEAT_INTERVAL_MS,
  JOB_WORKER_MAX_CONCURRENT,
} from "./constants";
import {
  appendLog,
  claimWaitingJobs,
  failJob,
  failStaleRunningJobs,
  heartbeat,
  retryJob,
} from "./job-service";
import { executeJob } from "./job-handlers";

let activeCount = 0;
let workerRunning = false;

async function runSingleJob(job: Job): Promise<void> {
  activeCount += 1;
  let hbTimer: ReturnType<typeof setInterval> | null = null;

  const ctx = {
    jobId: job.id,
    signalHeartbeat: () => heartbeat(job.id),
  };

  try {
    hbTimer = setInterval(() => {
      void heartbeat(job.id);
    }, JOB_HEARTBEAT_INTERVAL_MS);

    await appendLog(job.id, "INFO", "Worker görevi başlattı");
    await executeJob(job, ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Görev hatası";
    const fresh = await failJob(job.id, message);

    if (fresh.retryCount < fresh.maxRetry) {
      try {
        await retryJob(job.id);
        await appendLog(job.id, "WARN", "Otomatik yeniden kuyruğa alındı");
      } catch {
        /* max retry reached */
      }
    }
  } finally {
    if (hbTimer) clearInterval(hbTimer);
    activeCount -= 1;
  }
}

export async function processJobQueue(): Promise<{
  claimed: number;
  active: number;
  staleFailed: number;
}> {
  if (workerRunning) {
    return { claimed: 0, active: activeCount, staleFailed: 0 };
  }

  workerRunning = true;
  try {
    const staleFailed = await failStaleRunningJobs();
    const slots = Math.max(0, JOB_WORKER_MAX_CONCURRENT - activeCount);
    if (slots <= 0) {
      return { claimed: 0, active: activeCount, staleFailed };
    }

    const jobs = await claimWaitingJobs(slots);
    for (const job of jobs) {
      void runSingleJob(job);
    }

    return { claimed: jobs.length, active: activeCount + jobs.length, staleFailed };
  } finally {
    workerRunning = false;
  }
}

export function triggerWorker(): void {
  void processJobQueue();
}

export async function runWorkerTick(): Promise<{
  claimed: number;
  active: number;
  staleFailed: number;
}> {
  return processJobQueue();
}

export function getWorkerStatus() {
  return {
    activeCount,
    maxConcurrent: JOB_WORKER_MAX_CONCURRENT,
    workerRunning,
  };
}
