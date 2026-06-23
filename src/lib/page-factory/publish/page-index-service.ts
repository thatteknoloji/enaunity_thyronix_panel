import { prisma } from "@/lib/db";
import { parseMetadata, resolveBlueprintKind } from "@/lib/aeo/aeo-utils";
import type { PageFactoryPublishedPage } from "@prisma/client";
import {
  PAGE_INDEX_VERSION,
  type PublishedPageIndexFilters,
  type PublishedPageIndexItem,
  type PublishedPageIndexResult,
  type PublishedPageIndexStats,
  type PublishedPageValidationResult,
  resolvePageSize,
} from "./index-types";

function parsePageMeta(metadataJson: string): { blueprintType: string; generationSource: string } {
  const meta = parseMetadata(metadataJson);
  return {
    blueprintType: String(meta.blueprintKind || meta.blueprintType || ""),
    generationSource: String(meta.generationSource || meta.source || ""),
  };
}

function isIndexable(robots: string, status: string): boolean {
  return status === "PUBLISHED_INTERNAL" && !robots.includes("noindex");
}

function toIndexItem(page: PageFactoryPublishedPage): PublishedPageIndexItem {
  const { blueprintType, generationSource } = parsePageMeta(page.metadataJson);
  return {
    id: page.id,
    draftId: page.draftId,
    blueprintId: page.blueprintId,
    projectId: page.projectId,
    dealerId: page.dealerId,
    title: page.title,
    slug: page.slug,
    path: page.path,
    status: page.status,
    robots: page.robots,
    publishScore: page.publishScore,
    seoScore: page.seoScore,
    aeoScore: page.aeoScore,
    geoScore: page.geoScore,
    blueprintType,
    generationSource,
    indexable: isIndexable(page.robots, page.status),
    publishedAt: page.publishedAt?.toISOString() || null,
    updatedAt: page.updatedAt.toISOString(),
  };
}

function buildWhere(filters: PublishedPageIndexFilters): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.dealerId) where.dealerId = filters.dealerId;
  if (filters.status) where.status = filters.status;

  if (filters.robots === "index") {
    where.robots = { startsWith: "index" };
    where.status = "PUBLISHED_INTERNAL";
  } else if (filters.robots === "noindex") {
    where.robots = { contains: "noindex" };
  }

  if (filters.minSeoScore != null) where.seoScore = { gte: filters.minSeoScore };
  if (filters.minAeoScore != null) where.aeoScore = { gte: filters.minAeoScore };
  if (filters.minGeoScore != null) where.geoScore = { gte: filters.minGeoScore };
  if (filters.minPublishScore != null) where.publishScore = { gte: filters.minPublishScore };

  if (filters.query?.trim()) {
    const q = filters.query.trim();
    where.OR = [
      { title: { contains: q } },
      { slug: { contains: q } },
      { path: { contains: q } },
      { metaTitle: { contains: q } },
    ];
  }

  return where;
}

function matchesPostFilters(
  item: PublishedPageIndexItem,
  filters: PublishedPageIndexFilters
): boolean {
  if (filters.blueprintType && item.blueprintType !== filters.blueprintType) return false;
  if (filters.generationSource && item.generationSource !== filters.generationSource) return false;
  return true;
}

export async function getPublishedPageIndex(
  filters: PublishedPageIndexFilters,
  opts?: { isAdmin?: boolean }
): Promise<PublishedPageIndexResult> {
  const page = filters.page || 1;
  const pageSize = resolvePageSize(filters.pageSize, opts?.isAdmin);
  const where = buildWhere(filters);
  const needsPostFilter = !!(filters.blueprintType || filters.generationSource);

  if (!needsPostFilter) {
    const [rows, total] = await Promise.all([
      prisma.pageFactoryPublishedPage.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.pageFactoryPublishedPage.count({ where }),
    ]);
    return {
      items: rows.map(toIndexItem),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  const rows = await prisma.pageFactoryPublishedPage.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
  const all = rows.map(toIndexItem).filter((i) => matchesPostFilters(i, filters));
  const start = (page - 1) * pageSize;
  return {
    items: all.slice(start, start + pageSize),
    total: all.length,
    page,
    pageSize,
    totalPages: Math.ceil(all.length / pageSize),
  };
}

export async function getPublishedPageStats(projectId?: string, dealerId?: string | null): Promise<PublishedPageIndexStats> {
  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (dealerId) where.dealerId = dealerId;

  const [total, staged, publishedInternal, unpublished, archived, pages] = await Promise.all([
    prisma.pageFactoryPublishedPage.count({ where }),
    prisma.pageFactoryPublishedPage.count({ where: { ...where, status: "STAGED" } }),
    prisma.pageFactoryPublishedPage.count({ where: { ...where, status: "PUBLISHED_INTERNAL" } }),
    prisma.pageFactoryPublishedPage.count({ where: { ...where, status: "UNPUBLISHED" } }),
    prisma.pageFactoryPublishedPage.count({ where: { ...where, status: "ARCHIVED" } }),
    prisma.pageFactoryPublishedPage.findMany({
      where,
      select: { robots: true, status: true, seoScore: true, aeoScore: true, geoScore: true, publishScore: true },
    }),
  ]);

  const indexable = pages.filter((p) => isIndexable(p.robots, p.status)).length;
  const noindex = pages.filter((p) => p.robots.includes("noindex")).length;
  const avg = (key: "seoScore" | "aeoScore" | "geoScore" | "publishScore") =>
    pages.length ? Math.round(pages.reduce((s, p) => s + p[key], 0) / pages.length) : 0;

  return {
    total,
    staged,
    publishedInternal,
    unpublished,
    archived,
    indexable,
    noindex,
    avgSeoScore: avg("seoScore"),
    avgAeoScore: avg("aeoScore"),
    avgGeoScore: avg("geoScore"),
    avgPublishScore: avg("publishScore"),
  };
}

export async function searchPublishedPages(
  query: string,
  filters: PublishedPageIndexFilters,
  opts?: { isAdmin?: boolean }
): Promise<PublishedPageIndexResult> {
  return getPublishedPageIndex({ ...filters, query }, opts);
}

export async function getPublishedPageByPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return prisma.pageFactoryPublishedPage.findFirst({
    where: { path: normalized, status: "PUBLISHED_INTERNAL" },
  });
}

export async function getPublishedPageBySlug(slug: string) {
  return prisma.pageFactoryPublishedPage.findFirst({
    where: { slug, status: "PUBLISHED_INTERNAL" },
  });
}

export async function rebuildPublishedPageIndex(projectId?: string): Promise<{ updated: number; version: string }> {
  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;

  const pages = await prisma.pageFactoryPublishedPage.findMany({
    where,
    include: { draft: { include: { blueprint: true } } },
  });

  let updated = 0;
  for (const page of pages) {
    const bpMeta = parseMetadata(page.draft.blueprint.metadataJson);
    const blueprintKind = resolveBlueprintKind(bpMeta, page.draft.blueprint.pageType);
    const existing = parseMetadata(page.metadataJson);
    const nextMeta = {
      ...existing,
      version: PAGE_INDEX_VERSION,
      blueprintKind,
      generationSource: bpMeta.generationSource || bpMeta.source || existing.generationSource || "",
      blueprintType: blueprintKind,
      rebuiltAt: new Date().toISOString(),
    };

    await prisma.pageFactoryPublishedPage.update({
      where: { id: page.id },
      data: { metadataJson: JSON.stringify(nextMeta) },
    });
    updated++;
  }

  return { updated, version: PAGE_INDEX_VERSION };
}

export async function validatePublishedPages(projectId?: string): Promise<PublishedPageValidationResult> {
  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;

  const pages = await prisma.pageFactoryPublishedPage.findMany({ where });
  const pathSet = new Map<string, string>();
  const issues: PublishedPageValidationResult["issues"] = [];

  for (const page of pages) {
    if (!page.title.trim()) {
      issues.push({ pageId: page.id, path: page.path, issue: "Başlık eksik", severity: "error" });
    }
    if (!page.path.trim()) {
      issues.push({ pageId: page.id, path: page.path, issue: "Path eksik", severity: "error" });
    }
    if (page.status === "PUBLISHED_INTERNAL" && !page.h1.trim()) {
      issues.push({ pageId: page.id, path: page.path, issue: "H1 eksik", severity: "warning" });
    }
    if (page.status === "PUBLISHED_INTERNAL") {
      try {
        const body = JSON.parse(page.bodyJson || "[]");
        if (!Array.isArray(body) || body.length === 0) {
          issues.push({ pageId: page.id, path: page.path, issue: "Body boş", severity: "warning" });
        }
      } catch {
        issues.push({ pageId: page.id, path: page.path, issue: "bodyJson geçersiz", severity: "error" });
      }
    }

    const prev = pathSet.get(page.path);
    if (prev && prev !== page.id) {
      issues.push({ pageId: page.id, path: page.path, issue: "Duplicate path", severity: "error" });
    } else {
      pathSet.set(page.path, page.id);
    }
  }

  return {
    checked: pages.length,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    issues,
  };
}

export async function setPublishedPageRobots(
  pageId: string,
  robots: "index,follow" | "noindex,follow"
): Promise<{ id: string; robots: string }> {
  const page = await prisma.pageFactoryPublishedPage.update({
    where: { id: pageId },
    data: { robots },
  });
  return { id: page.id, robots: page.robots };
}

export async function getIndexablePublishedPages(projectId?: string) {
  const where: Record<string, unknown> = {
    status: "PUBLISHED_INTERNAL",
    robots: { startsWith: "index" },
  };
  if (projectId) where.projectId = projectId;

  const pages = await prisma.pageFactoryPublishedPage.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      path: true,
      updatedAt: true,
      publishedAt: true,
      metadataJson: true,
    },
  });

  const seen = new Set<string>();
  return pages.filter((p) => {
    if (seen.has(p.path)) return false;
    seen.add(p.path);
    return true;
  });
}
