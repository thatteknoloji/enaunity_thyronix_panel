import type { PublishingContentType } from "@prisma/client";
import type { PlanEngine } from "@/lib/content-planning/types";
import type { ContentAuditResult } from "@/lib/content-quality/types";
import type { PublishingQueue } from "@prisma/client";

export type ContentRef = {
  contentType: PublishingContentType;
  contentId: string;
  sourcePlanId?: string | null;
  metadata?: Record<string, unknown>;
};

export type PipelineStepResult = {
  contentType: PublishingContentType;
  contentId: string;
  audit: ContentAuditResult;
  queueStatus: string;
  published: boolean;
  queueId: string;
  error?: string;
};

export type FullPipelineResult = {
  planId: string;
  dryRun: boolean;
  generated: unknown;
  pipeline: PipelineStepResult[];
  queueRun?: { processed: number; published: number; failed: number };
  totalProcessed: number;
  totalApproved: number;
  totalReview: number;
  totalPublished: number;
};

export type OperationsDashboard = {
  totalPlans: number;
  totalProductions: number;
  qualityPending: number;
  queuePending: number;
  publishedTotal: number;
  publishedToday: number;
  avgQuality: number;
  recentPlans: Array<{
    id: string;
    name: string;
    primaryKeyword: string;
    status: string;
    estimatedContentCount: number;
    createdAt: string;
  }>;
  recentProductions: Array<{
    id: string;
    title: string;
    contentType: string;
    qualityScore: number;
    status: string;
  }>;
};

export type RunPipelineOptions = {
  dryRun?: boolean;
  autoPublish?: boolean;
  projectId?: string | null;
  engines?: PlanEngine[];
};

export type ProcessContentOptions = {
  sourcePlanId?: string | null;
  autoPublish?: boolean;
  publishMode?: "MANUAL" | "SCHEDULED" | "AUTOMATIC";
  metadata?: Record<string, unknown>;
};

export type ProcessContentResult = {
  audit: ContentAuditResult;
  queue: PublishingQueue;
  published: boolean;
};
