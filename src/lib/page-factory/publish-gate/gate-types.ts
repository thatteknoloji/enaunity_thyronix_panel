export type PublishGateCheckStatus = "PASS" | "WARN" | "FAIL";
export type PublishGateSeverity = "info" | "warning" | "blocker";

export type PublishGateCheck = {
  key: string;
  label: string;
  status: PublishGateCheckStatus;
  score: number;
  message: string;
  details?: Record<string, unknown>;
  severity: PublishGateSeverity;
};

export type PublishGateResult = {
  draftId: string;
  blueprintId: string;
  status: "PASSED" | "WARNING" | "BLOCKED" | "NEEDS_REVIEW";
  score: number;
  checks: PublishGateCheck[];
  blockers: PublishGateCheck[];
  warnings: PublishGateCheck[];
  suggestions: string[];
  passed: {
    seo: boolean;
    aeo: boolean;
    geo: boolean;
    duplicate: boolean;
    schema: boolean;
    policy: boolean;
  };
};

export type PublishGateBulkFilters = {
  projectId?: string;
  status?: string;
  minPublishScore?: number;
  onlyWithoutGate?: boolean;
  limit?: number;
  dryRun?: boolean;
};

export type GateDraftContext = {
  draft: {
    id: string;
    blueprintId: string;
    projectId: string | null;
    dealerId: string | null;
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    h1: string;
    intro: string;
    bodyJson: string;
    faqJson: string;
    schemaJson: string;
    internalLinksJson: string;
    seoScore: number;
    aeoScore: number;
    geoScore: number;
    publishScore: number;
    status: string;
    language: string;
    country: string;
    noindexRecommended: boolean;
  };
  sections: Array<{ type: string; heading: string; content: string }>;
  faq: Array<{ question: string; answer: string }>;
  schemaDraft: Record<string, unknown>;
  internalLinks: Array<{ anchor: string; targetType: string }>;
  blueprintMetadata: Record<string, unknown>;
  blueprintKind: string;
  aeo: Record<string, unknown> | null;
  projectCountry: string;
  siblingDrafts: Array<{
    id: string;
    slug: string;
    h1: string;
    metaTitle: string;
    intro: string;
    bodyJson: string;
  }>;
};
