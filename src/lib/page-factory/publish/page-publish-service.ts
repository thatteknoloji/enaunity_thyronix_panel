import { prisma } from "@/lib/db";
import { parseMetadata, resolveBlueprintKind } from "@/lib/aeo/aeo-utils";
import type { BlueprintKind } from "@/lib/aeo/aeo-types";
import type { PageFactoryPublishGateStatus } from "@prisma/client";
import { slugify } from "@/lib/utils";
import {
  PUBLISH_ENGINE_VERSION,
  type BulkPublishResult,
  type PublishBulkFilters,
  type PublishDraftResult,
  type PublishPreviewResult,
  type PublishedPageFilters,
  type PublishedPageStats,
  resolvePublishLimit,
} from "./publish-types";

function parseGeoPath(geoPath?: string | null): { province: string | null; district: string | null } {
  if (!geoPath?.trim()) return { province: null, district: null };
  const parts = geoPath.split(/[>]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { province: parts[0]!, district: parts[1]! };
  if (parts.length === 1) return { province: parts[0]!, district: null };
  return { province: null, district: null };
}

export function buildPublishedPath(
  blueprintKind: BlueprintKind | string,
  slug: string,
  metadata: Record<string, unknown>,
  aeo?: Record<string, unknown> | null,
  pageType?: string
): string {
  const cleanSlug = slugify(slug) || "sayfa";
  const kind = String(blueprintKind).toUpperCase();
  const pt = String(pageType || metadata.pageType || "").toUpperCase();

  if (kind === "PRODUCT_DETAIL" || pt === "PRODUCT_DETAIL") {
    return `/p/${cleanSlug}`;
  }
  if (kind === "PRODUCT_FAQ" || pt === "FAQ" || pt === "QUESTION") {
    return `/sss/${cleanSlug}`;
  }
  if (kind === "PRODUCT_CATEGORY" || pt === "CATEGORY") {
    return `/kategori/${cleanSlug}`;
  }
  if (kind === "PRODUCT_INTENT" || pt === "INTENT") {
    return `/rehber/${cleanSlug}`;
  }
  if (
    kind === "PRODUCT_GUIDE" ||
    kind === "PRODUCT_BENEFIT" ||
    kind === "PRODUCT_PROBLEM" ||
    kind === "PRODUCT_COMPARISON" ||
    kind === "PRODUCT_ALTERNATIVE" ||
    pt === "GUIDE"
  ) {
    return `/rehber/${cleanSlug}`;
  }
  if (kind === "PRODUCT_GEO" || pt === "GEO" || pt === "LOCATION") {
    const geoPath = (metadata.geoPath as string) || null;
    const geoHints = aeo?.geoHints as { province?: string; district?: string } | undefined;
    const parsed = parseGeoPath(geoPath);
    const province = slugify(parsed.province || geoHints?.province || "turkiye");
    const district = parsed.district || geoHints?.district;
    if (district) {
      return `/${province}/${slugify(district)}/${cleanSlug}`;
    }
    return `/${province}/${cleanSlug}`;
  }
  return `/sayfa/${cleanSlug}`;
}

async function resolveUniquePath(basePath: string, excludePageId?: string): Promise<string> {
  const existing = await prisma.pageFactoryPublishedPage.findUnique({ where: { path: basePath } });
  if (!existing || existing.id === excludePageId) return basePath;

  const segments = basePath.split("/").filter(Boolean);
  const slugPart = segments.pop() || "sayfa";
  const prefix = segments.length ? `/${segments.join("/")}` : "";

  for (let n = 2; n <= 99; n++) {
    const candidate = `${prefix}/${slugPart}-${n}`;
    const hit = await prisma.pageFactoryPublishedPage.findUnique({ where: { path: candidate } });
    if (!hit || hit.id === excludePageId) return candidate;
  }
  return `${basePath}-${Date.now()}`;
}

function gateAllowsPublish(status: PageFactoryPublishGateStatus | undefined): boolean {
  return status === "PASSED" || status === "WARNING";
}

type DraftBundle = NonNullable<Awaited<ReturnType<typeof loadDraftBundle>>>;

async function loadDraftBundle(draftId: string) {
  const draft = await prisma.pageFactoryContentDraft.findUnique({
    where: { id: draftId },
    include: {
      blueprint: { include: { project: true } },
      publishGate: true,
      publishedPage: true,
    },
  });
  if (!draft) return null;
  return draft;
}

function validatePublishEligibility(draft: DraftBundle): { eligible: boolean; blockers: string[]; warnings: string[] } {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (draft.status !== "READY_TO_PUBLISH") {
    blockers.push(`Draft status ${draft.status} — READY_TO_PUBLISH gerekli`);
  }
  if (!draft.publishGate) {
    blockers.push("Publish Gate kaydı yok");
  } else if (draft.publishGate.status === "BLOCKED") {
    blockers.push("Publish Gate BLOCKED — yayın engellendi");
  } else if (draft.publishGate.status === "NEEDS_REVIEW") {
    blockers.push("Publish Gate NEEDS_REVIEW — manuel onay gerekli");
  } else if (!gateAllowsPublish(draft.publishGate.status)) {
    blockers.push(`Publish Gate status ${draft.publishGate.status} yayına izin vermiyor`);
  } else if (draft.publishGate.status === "WARNING") {
    warnings.push("Publish Gate WARNING — dikkatli yayınlayın");
  }

  return { eligible: blockers.length === 0, blockers, warnings };
}

function resolveRobots(noindexRecommended: boolean): string {
  return noindexRecommended ? "noindex,follow" : "index,follow";
}

function buildPreviewFromDraft(draft: DraftBundle): PublishPreviewResult {
  const metadata = parseMetadata(draft.blueprint.metadataJson);
  const aeo = metadata.aeo as Record<string, unknown> | undefined;
  const blueprintKind = resolveBlueprintKind(metadata, draft.blueprint.pageType);
  const path = buildPublishedPath(blueprintKind, draft.slug, metadata, aeo, draft.blueprint.pageType);
  const validation = validatePublishEligibility(draft);

  return {
    draftId: draft.id,
    blueprintId: draft.blueprintId,
    title: draft.title,
    slug: draft.slug,
    path,
    robots: resolveRobots(draft.noindexRecommended),
    canonicalUrl: null,
    publishScore: draft.publishScore,
    seoScore: draft.seoScore,
    aeoScore: draft.aeoScore,
    geoScore: draft.geoScore,
    blueprintKind,
    gateStatus: draft.publishGate?.status || "MISSING",
    draftStatus: draft.status,
    eligible: validation.eligible,
    blockers: validation.blockers,
    warnings: validation.warnings,
  };
}

export async function previewPublishDraft(draftId: string): Promise<PublishPreviewResult> {
  const draft = await loadDraftBundle(draftId);
  if (!draft) throw new Error("Draft bulunamadı");
  return buildPreviewFromDraft(draft);
}

export async function publishDraftInternal(draftId: string): Promise<PublishDraftResult> {
  const draft = await loadDraftBundle(draftId);
  if (!draft) throw new Error("Draft bulunamadı");

  const preview = buildPreviewFromDraft(draft);
  if (!preview.eligible) {
    throw new Error(preview.blockers.join("; ") || "Yayın koşulları sağlanmıyor");
  }

  const metadata = parseMetadata(draft.blueprint.metadataJson);
  const aeo = metadata.aeo as Record<string, unknown> | undefined;
  const blueprintKind = resolveBlueprintKind(metadata, draft.blueprint.pageType);
  const basePath = buildPublishedPath(blueprintKind, draft.slug, metadata, aeo, draft.blueprint.pageType);
  const path = await resolveUniquePath(basePath, draft.publishedPage?.id);
  const robots = resolveRobots(draft.noindexRecommended);

  const pageData = {
    blueprintId: draft.blueprintId,
    projectId: draft.projectId,
    dealerId: draft.dealerId,
    title: draft.title,
    slug: slugify(draft.slug) || draft.slug,
    path,
    h1: draft.h1,
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    bodyJson: draft.bodyJson,
    faqJson: draft.faqJson,
    schemaJson: draft.schemaJson,
    internalLinksJson: draft.internalLinksJson,
    canonicalUrl: null as string | null,
    robots,
    status: "PUBLISHED_INTERNAL" as const,
    publishScore: draft.publishScore,
    seoScore: draft.seoScore,
    aeoScore: draft.aeoScore,
    geoScore: draft.geoScore,
    sourceJson: draft.sourceJson,
    metadataJson: JSON.stringify({
      version: PUBLISH_ENGINE_VERSION,
      intro: draft.intro,
      blueprintKind,
      language: draft.language,
      country: draft.country,
      noindexRecommended: draft.noindexRecommended,
      publishedVia: "internal",
    }),
    publishedAt: new Date(),
  };

  if (draft.publishedPage) {
    const updated = await prisma.pageFactoryPublishedPage.update({
      where: { id: draft.publishedPage.id },
      data: pageData,
    });
    return {
      pageId: updated.id,
      draftId: draft.id,
      path: updated.path,
      slug: updated.slug,
      status: updated.status,
      robots: updated.robots,
      created: false,
      updated: true,
    };
  }

  const created = await prisma.pageFactoryPublishedPage.create({
    data: { draftId: draft.id, ...pageData },
  });
  return {
    pageId: created.id,
    draftId: draft.id,
    path: created.path,
    slug: created.slug,
    status: created.status,
    robots: created.robots,
    created: true,
    updated: false,
  };
}

export async function bulkPublishDrafts(
  filters: PublishBulkFilters,
  opts: { isAdmin?: boolean; dealerId?: string | null }
): Promise<BulkPublishResult> {
  const limit = resolvePublishLimit(filters.limit, opts.isAdmin);
  const stopOnError = filters.stopOnError ?? false;

  const where: Record<string, unknown> = { status: "READY_TO_PUBLISH" };
  if (filters.projectId) where.projectId = filters.projectId;
  if (!opts.isAdmin && opts.dealerId) where.dealerId = opts.dealerId;
  if (filters.minPublishScore != null) where.publishScore = { gte: filters.minPublishScore };

  const drafts = await prisma.pageFactoryContentDraft.findMany({
    where,
    include: {
      blueprint: true,
      publishGate: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit * 3,
  });

  const filtered = drafts.filter((d) => {
    if (!d.publishGate || !gateAllowsPublish(d.publishGate.status)) return false;
    const meta = parseMetadata(d.blueprint.metadataJson);
    if (filters.generationSource && meta.generationSource !== filters.generationSource) return false;
    if (filters.blueprintType) {
      const kind = resolveBlueprintKind(meta, d.blueprint.pageType);
      if (kind !== filters.blueprintType) return false;
    }
    return true;
  }).slice(0, limit);

  const result: BulkPublishResult = {
    processed: 0,
    published: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const d of filtered) {
    result.processed++;
    try {
      const r = await publishDraftInternal(d.id);
      if (r.created) result.published++;
      else if (r.updated) result.updated++;
    } catch (e) {
      result.skipped++;
      result.errors.push({
        draftId: d.id,
        message: e instanceof Error ? e.message : "Yayın hatası",
      });
      if (stopOnError) break;
    }
  }

  return result;
}

export async function unpublishPage(pageId: string): Promise<{ id: string; status: string }> {
  const page = await prisma.pageFactoryPublishedPage.update({
    where: { id: pageId },
    data: { status: "UNPUBLISHED", publishedAt: null },
  });
  return { id: page.id, status: page.status };
}

export async function getPublishedPageById(id: string, dealerId?: string | null) {
  const page = await prisma.pageFactoryPublishedPage.findUnique({ where: { id } });
  if (!page) return null;
  if (dealerId && page.dealerId && page.dealerId !== dealerId) return null;
  return page;
}

export async function getPublishedPageBySlug(slug: string) {
  const { getPublishedPageBySlug: bySlug } = await import("./page-index-service");
  return bySlug(slug);
}

export async function getPublishedPageByPath(path: string) {
  const { getPublishedPageByPath: byPath } = await import("./page-index-service");
  return byPath(path);
}

export async function getPublishedPages(filters: PublishedPageFilters) {
  const page = filters.page || 1;
  const limit = Math.min(50, filters.limit || 20);
  const where: Record<string, unknown> = {};

  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.dealerId) where.dealerId = filters.dealerId;
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { slug: { contains: filters.search } },
      { path: { contains: filters.search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.pageFactoryPublishedPage.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pageFactoryPublishedPage.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPublishedPageStats(opts: {
  projectId?: string;
  dealerId?: string | null;
}): Promise<PublishedPageStats> {
  const where: Record<string, unknown> = {};
  if (opts.projectId) where.projectId = opts.projectId;
  if (opts.dealerId) where.dealerId = opts.dealerId;

  const [total, staged, publishedInternal, unpublished, archived, pages] = await Promise.all([
    prisma.pageFactoryPublishedPage.count({ where }),
    prisma.pageFactoryPublishedPage.count({ where: { ...where, status: "STAGED" } }),
    prisma.pageFactoryPublishedPage.count({ where: { ...where, status: "PUBLISHED_INTERNAL" } }),
    prisma.pageFactoryPublishedPage.count({ where: { ...where, status: "UNPUBLISHED" } }),
    prisma.pageFactoryPublishedPage.count({ where: { ...where, status: "ARCHIVED" } }),
    prisma.pageFactoryPublishedPage.findMany({
      where,
      select: { robots: true, seoScore: true, aeoScore: true, geoScore: true, publishScore: true },
    }),
  ]);

  const indexCount = pages.filter((p) => p.robots.startsWith("index")).length;
  const noindexCount = pages.filter((p) => p.robots.includes("noindex")).length;
  const avg = (key: "seoScore" | "aeoScore" | "geoScore" | "publishScore") =>
    pages.length ? Math.round(pages.reduce((s, p) => s + p[key], 0) / pages.length) : 0;

  return {
    total,
    staged,
    publishedInternal,
    unpublished,
    archived,
    indexCount,
    noindexCount,
    avgSeoScore: avg("seoScore"),
    avgAeoScore: avg("aeoScore"),
    avgGeoScore: avg("geoScore"),
    avgPublishScore: avg("publishScore"),
  };
}

export async function assertPublishedPageAccess(
  pageId: string,
  user: { role: string; dealerId?: string | null }
) {
  const page = await getPublishedPageById(pageId, null);
  if (!page) throw new Error("Sayfa bulunamadı");
  const { isAdminRole } = await import("@/lib/auth/admin-access");
  if (!isAdminRole(user.role) && page.dealerId && page.dealerId !== user.dealerId) {
    throw new Error("Bu sayfaya erişim yetkiniz yok");
  }
  return page;
}
