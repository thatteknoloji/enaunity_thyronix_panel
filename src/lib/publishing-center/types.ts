import type {
  PublishingContentType,
  PublishingMode,
  PublishingQueueStatus,
} from "@prisma/client";

export const QUALITY_THRESHOLDS = {
  seoScore: 70,
  geoScore: 60,
  qualityScore: 70,
} as const;

export type QueueContentInput = {
  contentType: PublishingContentType;
  contentId: string;
  sourcePlanId?: string | null;
  publishMode?: PublishingMode;
  priority?: number;
  scheduledAt?: Date | null;
  metadata?: Record<string, unknown>;
  skipQualityCheck?: boolean;
};

export type PublishingStats = {
  total: number;
  draft: number;
  review: number;
  approved: number;
  scheduled: number;
  published: number;
  archived: number;
  rejected: number;
  publishedToday: number;
  scheduledThisWeek: number;
  avgQuality: number;
  pending: number;
};

export type CalendarDay = {
  date: string;
  blogs: number;
  pages: number;
  geo: number;
  products: number;
  recovery: number;
  total: number;
};

export type BatchResult = {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
};

export type RunQueueResult = {
  processed: number;
  published: number;
  failed: number;
  errors: string[];
};

export type QualityCheckResult = {
  passed: boolean;
  seoScore: number;
  geoScore: number;
  qualityScore: number;
  suggestedStatus: "APPROVED" | "REVIEW";
};

export const ACTIVE_QUEUE_STATUSES: PublishingQueueStatus[] = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "SCHEDULED",
];
