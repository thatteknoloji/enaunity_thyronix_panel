import type { AeoBlueprintPayload } from "@/lib/aeo/aeo-types";
import type { BlueprintKind } from "@/lib/aeo/aeo-types";
import type {
  PageFactoryBlueprint,
  PageFactoryContentDraftStatus,
  PageFactoryProject,
  ProductAttribute,
  ProductContentDNA,
  ProductEntity,
  ProductImage,
  ProductUniverse,
} from "@prisma/client";

export const CONTENT_DRAFT_VERSION = "PAGE_FACTORY_V3" as const;

export type ContentDraftSectionType =
  | "HERO"
  | "QUICK_ANSWER"
  | "INTRO"
  | "PRODUCT_SUMMARY"
  | "FEATURE_GRID"
  | "USE_CASES"
  | "BUYING_GUIDE"
  | "COMPARISON"
  | "GEO_CONTEXT"
  | "FAQ"
  | "CTA";

export type ContentDraftSection = {
  id: string;
  type: ContentDraftSectionType;
  heading: string;
  content: string;
  bullets: string[];
  entities: string[];
  sourceHints: Array<{ sourceType: string; field: string }>;
  metadata: Record<string, unknown>;
};

export type ContentDraftFaq = {
  id: string;
  question: string;
  answer: string;
};

export type ContentDraftInternalLink = {
  anchor: string;
  targetType: string;
  targetId: string | null;
  targetSlug: string | null;
  reason: string;
  priority: number;
};

export type ContentDraftQuality = {
  seoScore: number;
  aeoScore: number;
  geoScore: number;
  publishScore: number;
};

export type ContentDraftPayload = {
  version: typeof CONTENT_DRAFT_VERSION;
  blueprintId: string;
  blueprintType: BlueprintKind;
  productId: string | null;
  targetQuery: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: ContentDraftSection[];
  faq: ContentDraftFaq[];
  schemaDraft: Record<string, unknown>;
  internalLinks: ContentDraftInternalLink[];
  sourceJson: Record<string, unknown>;
  quality: ContentDraftQuality;
  status: PageFactoryContentDraftStatus;
  noindexRecommended: boolean;
  contentPolicyWarnings: string[];
  generatedAt: string;
};

export type ContentDraftBulkFilters = {
  blueprintType?: string;
  generationSource?: string;
  minAeoScore?: number;
  minQualityScore?: number;
  limit?: number;
  dryRun?: boolean;
  onlyWithoutDraft?: boolean;
};

export type DraftContext = {
  blueprint: PageFactoryBlueprint;
  project: PageFactoryProject;
  metadata: Record<string, unknown>;
  blueprintKind: BlueprintKind;
  product: ProductUniverse | null;
  entities: ProductEntity[];
  attributes: ProductAttribute[];
  images: ProductImage[];
  contentDNA: ProductContentDNA | null;
  aeo: AeoBlueprintPayload | null;
};

export const BLUEPRINT_CONTENT_STATUSES = [
  "NOT_GENERATED",
  "AEO_READY",
  "DRAFT_GENERATED",
  "NEEDS_REVIEW",
  "READY_TO_PUBLISH",
  "REJECTED",
] as const;

export type BlueprintContentStatus = (typeof BLUEPRINT_CONTENT_STATUSES)[number];
