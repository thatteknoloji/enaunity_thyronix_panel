import type { JobPriority } from "@prisma/client";

export const JOB_WORKER_MAX_CONCURRENT = Number(process.env.JOB_WORKER_MAX_CONCURRENT || 3);
export const JOB_HEARTBEAT_INTERVAL_MS = Number(process.env.JOB_HEARTBEAT_INTERVAL_MS || 5000);
export const JOB_HEARTBEAT_TIMEOUT_SEC = Number(process.env.JOB_HEARTBEAT_TIMEOUT_SEC || 30);
export const JOB_DEFAULT_MAX_RETRY = 3;

export const PRIORITY_ORDER: Record<JobPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
};

export const PROGRESS_STEPS = {
  PREPARING: "Hazırlanıyor",
  AI_WRITING: "AI içerik yazılıyor",
  QUALITY: "Kalite denetleniyor",
  INTERNAL_LINKS: "İç linkler oluşturuluyor",
  SAVING: "Kaydediliyor",
  QUEUE: "Yayın kuyruğuna ekleniyor",
  DONE: "Tamamlandı",
} as const;
