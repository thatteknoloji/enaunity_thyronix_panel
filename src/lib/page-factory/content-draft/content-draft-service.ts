import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/auth/admin-access";
import type { AeoBlueprintPayload } from "@/lib/aeo/aeo-types";
import { resolveBlueprintKind, parseMetadata } from "@/lib/aeo/aeo-utils";
import type { ContentDraftBulkFilters, ContentDraftPayload, DraftContext } from "./draft-types";
import { CONTENT_DRAFT_VERSION } from "./draft-types";
import { policyWarnings, productName, slugFromContext, targetQuery } from "./draft-utils";
import { generateTitles } from "./title-engine";
import { generateIntro, generateMetaDescription } from "./meta-engine";
import { generateSections } from "./section-engine";
import { generateFaqSection } from "./faq-section-engine";
import { generateSchemaDraft } from "./schema-draft-engine";
import { generateInternalLinks } from "./internal-link-engine";
import {
  calculateGeoScore,
  calculatePublishScore,
  calculateSeoScore,
  resolveBlueprintContentStatus,
  resolveDraftStatus,
} from "./publish-score-engine";

export const PLAN_ONLY_THRESHOLD = 100_000;
export const DEFAULT_BULK_LIMIT = 100;
export const ADMIN_MAX_BULK = 500;
export const DEALER_MAX_BULK = 100;

export type ContentDraftGenerateResult = {
  blueprintId: string;
  draftId?: string;
  dryRun: boolean;
  payload: ContentDraftPayload;
  written: boolean;
};

export type ContentDraftBulkResult = {
  processed: number;
  written: number;
  skipped: number;
  dryRun: boolean;
  planOnly?: boolean;
  generationPlan?: string;
  results: Array<{ blueprintId: string; publishScore: number; status: string; written: boolean }>;
  errors: Array<{ blueprintId: string; message: string }>;
};

async function loadDraftContext(blueprintId: string): Promise<DraftContext> {
  const blueprint = await prisma.pageFactoryBlueprint.findUnique({
    where: { id: blueprintId },
    include: { project: true },
  });
  if (!blueprint) throw new Error("Blueprint bulunamadı");

  const metadata = parseMetadata(blueprint.metadataJson);
  const blueprintKind = resolveBlueprintKind(metadata, blueprint.pageType);
  const productId = metadata.productId as string | undefined;

  let product = null;
  let entities: DraftContext["entities"] = [];
  let attributes: DraftContext["attributes"] = [];
  let images: DraftContext["images"] = [];
  let contentDNA = null;

  if (productId) {
    product = await prisma.productUniverse.findUnique({
      where: { id: productId },
      include: { entities: true, attributes: true, images: true, contentDNA: true },
    });
    if (product) {
      entities = product.entities;
      attributes = product.attributes;
      images = product.images;
      contentDNA = product.contentDNA;
    }
  }

  const aeoRaw = metadata.aeo as AeoBlueprintPayload | undefined;
  const aeo = aeoRaw?.version === "AEO_LAYER_V1" ? aeoRaw : null;

  return {
    blueprint,
    project: blueprint.project,
    metadata,
    blueprintKind,
    product,
    entities,
    attributes,
    images,
    contentDNA,
    aeo,
  };
}

export function buildContentDraftPayload(ctx: DraftContext): ContentDraftPayload {
  const titles = generateTitles(ctx);
  const intro = generateIntro(ctx);
  const metaDescription = generateMetaDescription(ctx, titles.h1);
  const sections = generateSections(ctx);
  const faq = generateFaqSection(ctx);
  const internalLinks = generateInternalLinks(ctx);
  const schemaDraft = generateSchemaDraft(ctx, faq);
  const noindexRecommended =
    ctx.metadata.noindexRecommended === true || ctx.aeo?.noindexRecommended === true;

  const aeoScore = ctx.aeo?.aeoQualityScore ?? 0;
  const productQualityScore = Number(ctx.metadata.qualityScore ?? ctx.product?.qualityScore ?? 100);

  const basePayload: ContentDraftPayload = {
    version: CONTENT_DRAFT_VERSION,
    blueprintId: ctx.blueprint.id,
    blueprintType: ctx.blueprintKind,
    productId: (ctx.metadata.productId as string) || ctx.product?.id || null,
    targetQuery: targetQuery(ctx),
    title: titles.title,
    slug: slugFromContext(ctx),
    metaTitle: titles.metaTitle,
    metaDescription,
    h1: titles.h1,
    intro,
    sections,
    faq,
    schemaDraft,
    internalLinks,
    sourceJson: {
      generationSource: ctx.metadata.generationSource,
      importSource: ctx.metadata.importSource,
      productId: ctx.metadata.productId,
      blueprintKind: ctx.blueprintKind,
      hasAeo: !!ctx.aeo,
    },
    quality: { seoScore: 0, aeoScore, geoScore: 0, publishScore: 0 },
    status: "DRAFT",
    noindexRecommended,
    contentPolicyWarnings: policyWarnings(ctx),
    generatedAt: new Date().toISOString(),
  };

  basePayload.quality.seoScore = calculateSeoScore(basePayload);
  basePayload.quality.geoScore = calculateGeoScore(basePayload);
  basePayload.quality.publishScore = calculatePublishScore({
    payload: basePayload,
    productQualityScore,
  });
  basePayload.status = resolveDraftStatus(
    basePayload.quality.publishScore,
    noindexRecommended,
    productQualityScore
  );

  return basePayload;
}

export async function previewContentDraftForBlueprint(blueprintId: string): Promise<ContentDraftPayload> {
  const ctx = await loadDraftContext(blueprintId);
  return buildContentDraftPayload(ctx);
}

export async function generateContentDraftForBlueprint(
  blueprintId: string,
  dryRun = false
): Promise<ContentDraftGenerateResult> {
  const ctx = await loadDraftContext(blueprintId);
  const payload = buildContentDraftPayload(ctx);

  if (dryRun) {
    return { blueprintId, dryRun: true, payload, written: false };
  }

  const draftData = {
    blueprintId,
    projectId: ctx.blueprint.projectId,
    dealerId: ctx.project.dealerId,
    title: payload.title,
    slug: payload.slug,
    metaTitle: payload.metaTitle,
    metaDescription: payload.metaDescription,
    h1: payload.h1,
    intro: payload.intro,
    bodyJson: JSON.stringify(payload.sections),
    faqJson: JSON.stringify(payload.faq),
    schemaJson: JSON.stringify(payload.schemaDraft),
    internalLinksJson: JSON.stringify(payload.internalLinks),
    sourceJson: JSON.stringify(payload.sourceJson),
    seoScore: payload.quality.seoScore,
    aeoScore: payload.quality.aeoScore,
    geoScore: payload.quality.geoScore,
    publishScore: payload.quality.publishScore,
    status: payload.status,
    language: ctx.project.language || "tr",
    country: ctx.project.country || "TR",
    noindexRecommended: payload.noindexRecommended,
    metadataJson: JSON.stringify({
      version: CONTENT_DRAFT_VERSION,
      contentPolicyWarnings: payload.contentPolicyWarnings,
      blueprintType: payload.blueprintType,
    }),
  };

  const draft = await prisma.pageFactoryContentDraft.upsert({
    where: { blueprintId },
    create: draftData,
    update: draftData,
  });

  const blueprintStatus = resolveBlueprintContentStatus(payload.status);
  const nextMetadata = {
    ...ctx.metadata,
    contentStatus: blueprintStatus,
    contentDraft: {
      draftId: draft.id,
      generatedAt: payload.generatedAt,
      publishScore: payload.quality.publishScore,
      version: CONTENT_DRAFT_VERSION,
    },
  };

  await prisma.pageFactoryBlueprint.update({
    where: { id: blueprintId },
    data: { metadataJson: JSON.stringify(nextMetadata) },
  });

  return { blueprintId, draftId: draft.id, dryRun: false, payload, written: true };
}

export async function getContentDraftForBlueprint(blueprintId: string) {
  return prisma.pageFactoryContentDraft.findUnique({ where: { blueprintId } });
}

export async function getContentDraftById(draftId: string) {
  return prisma.pageFactoryContentDraft.findUnique({
    where: { id: draftId },
    include: { blueprint: { include: { project: true } } },
  });
}

export async function assertDraftAccess(
  blueprintId: string,
  user: { role: string; dealerId?: string | null }
) {
  const ctx = await loadDraftContext(blueprintId);
  if (!isAdminRole(user.role) && ctx.project.dealerId && ctx.project.dealerId !== user.dealerId) {
    throw new Error("Bu blueprinte erişim yetkiniz yok");
  }
  return ctx;
}

export async function listContentDrafts(opts: {
  projectId?: string;
  dealerId?: string | null;
  isAdmin: boolean;
  status?: string;
  limit?: number;
  page?: number;
}) {
  const limit = Math.min(opts.limit ?? 30, 100);
  const page = Math.max(1, opts.page ?? 1);
  const where: Record<string, unknown> = {};
  if (opts.projectId) where.projectId = opts.projectId;
  if (!opts.isAdmin && opts.dealerId) where.dealerId = opts.dealerId;
  if (opts.status) where.status = opts.status;

  const [items, total] = await Promise.all([
    prisma.pageFactoryContentDraft.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { blueprint: { select: { title: true, pageType: true, metadataJson: true } } },
    }),
    prisma.pageFactoryContentDraft.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getProjectDraftStats(projectId: string) {
  const blueprints = await prisma.pageFactoryBlueprint.count({ where: { projectId } });
  const drafts = await prisma.pageFactoryContentDraft.groupBy({
    by: ["status"],
    where: { projectId },
    _count: true,
    _avg: { publishScore: true, aeoScore: true },
  });

  const totalDrafts = drafts.reduce((s, d) => s + d._count, 0);
  const ready = drafts.find((d) => d.status === "READY_TO_PUBLISH")?._count ?? 0;
  const needsReview = drafts.find((d) => d.status === "NEEDS_REVIEW")?._count ?? 0;
  const rejected = drafts.find((d) => d.status === "REJECTED")?._count ?? 0;

  const allDrafts = await prisma.pageFactoryContentDraft.findMany({
    where: { projectId },
    select: { publishScore: true, aeoScore: true },
  });
  const avgPublish =
    allDrafts.length ? Math.round(allDrafts.reduce((s, d) => s + d.publishScore, 0) / allDrafts.length) : 0;
  const avgAeo =
    allDrafts.length ? Math.round(allDrafts.reduce((s, d) => s + d.aeoScore, 0) / allDrafts.length) : 0;

  return {
    totalBlueprints: blueprints,
    totalDrafts,
    readyToPublish: ready,
    needsReview,
    rejected,
    withoutDraft: blueprints - totalDrafts,
    avgPublishScore: avgPublish,
    avgAeoScore: avgAeo,
  };
}

function matchesDraftFilter(
  metadata: Record<string, unknown>,
  blueprintId: string,
  filters: ContentDraftBulkFilters,
  hasDraft: boolean
): boolean {
  if (filters.generationSource && metadata.generationSource !== filters.generationSource) return false;
  if (filters.blueprintType && metadata.blueprintKind !== filters.blueprintType) return false;
  if (filters.minQualityScore != null) {
    const qs = Number(metadata.qualityScore ?? 0);
    if (qs < filters.minQualityScore) return false;
  }
  if (filters.minAeoScore != null) {
    const aeo = metadata.aeo as { aeoQualityScore?: number } | undefined;
    if ((aeo?.aeoQualityScore ?? 0) < filters.minAeoScore) return false;
  }
  if (filters.onlyWithoutDraft && hasDraft) return false;
  return true;
}

export async function generateBulkContentDrafts(
  projectId: string,
  filters: ContentDraftBulkFilters = {},
  isAdmin = true
): Promise<ContentDraftBulkResult> {
  const maxLimit = isAdmin ? ADMIN_MAX_BULK : DEALER_MAX_BULK;
  const limit = Math.min(filters.limit ?? DEFAULT_BULK_LIMIT, maxLimit);

  const totalBlueprints = await prisma.pageFactoryBlueprint.count({ where: { projectId } });
  if (totalBlueprints > PLAN_ONLY_THRESHOLD) {
    return {
      processed: 0,
      written: 0,
      skipped: 0,
      dryRun: filters.dryRun ?? false,
      planOnly: true,
      generationPlan: `${totalBlueprints.toLocaleString("tr-TR")} blueprint — toplu draft plan modu önerilir`,
      results: [],
      errors: [],
    };
  }

  const existingDrafts = await prisma.pageFactoryContentDraft.findMany({
    where: { projectId },
    select: { blueprintId: true },
  });
  const draftSet = new Set(existingDrafts.map((d) => d.blueprintId));

  const all = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
    take: limit * 3,
  });

  const matched = all
    .filter((bp) => {
      const metadata = parseMetadata(bp.metadataJson);
      return matchesDraftFilter(metadata, bp.id, filters, draftSet.has(bp.id));
    })
    .slice(0, limit);

  const result: ContentDraftBulkResult = {
    processed: 0,
    written: 0,
    skipped: 0,
    dryRun: filters.dryRun ?? false,
    results: [],
    errors: [],
  };

  for (const bp of matched) {
    result.processed++;
    try {
      const gen = await generateContentDraftForBlueprint(bp.id, filters.dryRun ?? false);
      result.results.push({
        blueprintId: bp.id,
        publishScore: gen.payload.quality.publishScore,
        status: gen.payload.status,
        written: gen.written,
      });
      if (gen.written) result.written++;
    } catch (e) {
      result.skipped++;
      result.errors.push({
        blueprintId: bp.id,
        message: e instanceof Error ? e.message : "Bilinmeyen hata",
      });
    }
  }

  return result;
}
