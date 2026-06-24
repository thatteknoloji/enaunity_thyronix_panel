import type { ContentPlanNodeType, ContentPlanTargetType } from "@prisma/client";

export type PlanEngine = "BLOG" | "GEO" | "PAGE";

export type InternalLinkNodeMap = {
  nodeId: string;
  title: string;
  nodeType: ContentPlanNodeType;
  parent: string[];
  children: string[];
  siblings: string[];
};

export type ContentMapTree = {
  rootId: string | null;
  sections: {
    landing: string[];
    blogs: string[];
    faq: string[];
    geo: string[];
    categories: string[];
    products: string[];
  };
  nodes: Array<{
    id: string;
    title: string;
    nodeType: ContentPlanNodeType;
    parentNodeId: string | null;
    keyword: string;
    province?: string | null;
    district?: string | null;
    priority: number;
    estimatedTraffic: number;
  }>;
};

export type PlanDraftNode = {
  nodeType: ContentPlanNodeType;
  title: string;
  keyword: string;
  province?: string | null;
  district?: string | null;
  priority: number;
  estimatedTraffic: number;
  parentKey?: string | null;
  metadata?: Record<string, unknown>;
};

export type PlanDraft = {
  name: string;
  primaryKeyword: string;
  keywordGroup: string[];
  category?: string | null;
  targetType: ContentPlanTargetType;
  nodes: PlanDraftNode[];
};

export type TrafficEstimate = {
  totalTraffic: number;
  estimatedContentCount: number;
  estimatedGeoCount: number;
  estimatedFaqCount: number;
  estimatedLandingCount: number;
  estimatedClusterCount: number;
  byType: Record<string, number>;
};

export type PlanPreview = PlanDraft & {
  traffic: TrafficEstimate;
  contentMap: ContentMapTree;
  internalLinkMap: InternalLinkNodeMap[];
};

export type PublishPlanResult = {
  planId: string;
  engines: PlanEngine[];
  blog: { processed: number; created: number; updated: number; errors: string[] };
  geo: { jobId?: string; generated: number; failed: number };
  page: { processed: number; created: number; errors: string[] };
};

export type PlanningDashboard = {
  totalPlans: number;
  totalContentTargets: number;
  totalGeoTargets: number;
  recentPlans: Array<{
    id: string;
    name: string;
    primaryKeyword: string;
    status: string;
    estimatedContentCount: number;
    estimatedGeoCount: number;
    createdAt: string;
  }>;
};

export type ContentPlanInput = {
  primaryKeyword: string;
  keywordGroup?: string[];
  category?: string | null;
  productId?: string | null;
  productName?: string | null;
  includeGeo?: boolean;
  geoProvinces?: string[];
  includeFaq?: boolean;
  includeBlogs?: boolean;
  includeCategories?: boolean;
  projectId?: string | null;
  name?: string;
};
