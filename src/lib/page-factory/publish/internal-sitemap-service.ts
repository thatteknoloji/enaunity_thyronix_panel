import { prisma } from "@/lib/db";
import type { PageFactoryInternalSitemapType } from "@prisma/client";
import { parseMetadata } from "@/lib/aeo/aeo-utils";
import { getIndexablePublishedPages } from "./page-index-service";

export const INTERNAL_SITEMAP_VERSION = "PAGE_FACTORY_INTERNAL_SITEMAP_V1" as const;
export const SITEMAP_MAX_URLS = 50_000;

export type SitemapUrlEntry = {
  path: string;
  slug: string;
  title: string;
  lastmod: string;
};

export type InternalSitemapPayload = {
  version: string;
  sitemapType: string;
  projectId: string | null;
  urls: SitemapUrlEntry[];
  totalUrls: number;
  chunkIndex: number;
  chunkCount: number;
  generatedAt: string;
};

export type InternalSitemapFilters = {
  projectId?: string;
  sitemapType?: string;
  status?: string;
  page?: number;
  limit?: number;
};

const SITEMAP_TYPES: PageFactoryInternalSitemapType[] = [
  "MAIN",
  "PROJECT",
  "GEO",
  "PRODUCT",
  "FAQ",
  "CATEGORY",
  "INTENT",
];

function pathMatchesType(path: string, type: PageFactoryInternalSitemapType): boolean {
  if (type === "MAIN" || type === "PROJECT") return true;
  if (type === "PRODUCT") return path.startsWith("/p/");
  if (type === "FAQ") return path.startsWith("/sss/");
  if (type === "CATEGORY") return path.startsWith("/kategori/");
  if (type === "INTENT") return path.startsWith("/rehber/");
  if (type === "GEO") {
    return (
      !path.startsWith("/p/") &&
      !path.startsWith("/sss/") &&
      !path.startsWith("/kategori/") &&
      !path.startsWith("/rehber/") &&
      !path.startsWith("/sayfa/")
    );
  }
  return true;
}

function buildSitemapPath(
  type: PageFactoryInternalSitemapType,
  projectId: string | null,
  chunkIndex: number
): string {
  const base = projectId ? `/pf-sitemap/${projectId}` : "/pf-sitemap";
  if (chunkIndex === 0) {
    if (type === "MAIN") return `${base}/internal.json`;
    return `${base}/${type.toLowerCase()}.json`;
  }
  return `${base}/${type.toLowerCase()}-${chunkIndex + 1}.json`;
}

function chunkUrls(urls: SitemapUrlEntry[]): SitemapUrlEntry[][] {
  const chunks: SitemapUrlEntry[][] = [];
  for (let i = 0; i < urls.length; i += SITEMAP_MAX_URLS) {
    chunks.push(urls.slice(i, i + SITEMAP_MAX_URLS));
  }
  return chunks.length ? chunks : [[]];
}

async function collectUrls(
  projectId: string | null | undefined,
  type: PageFactoryInternalSitemapType
): Promise<SitemapUrlEntry[]> {
  const pages = await getIndexablePublishedPages(projectId || undefined);
  const seen = new Set<string>();

  return pages
    .filter((p) => pathMatchesType(p.path, type))
    .filter((p) => {
      if (seen.has(p.path)) return false;
      seen.add(p.path);
      return true;
    })
    .map((p) => ({
      path: p.path,
      slug: p.slug,
      title: p.title,
      lastmod: (p.publishedAt || p.updatedAt).toISOString(),
    }));
}

export async function generateInternalSitemap(
  projectId?: string | null,
  type?: PageFactoryInternalSitemapType
): Promise<{ created: number; updated: number; totalUrls: number }> {
  const sitemapType = type || "MAIN";
  const urls = await collectUrls(projectId, sitemapType);
  const chunks = chunkUrls(urls);
  let created = 0;
  let updated = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const path = buildSitemapPath(sitemapType, projectId || null, i);
    const payload: InternalSitemapPayload = {
      version: INTERNAL_SITEMAP_VERSION,
      sitemapType,
      projectId: projectId || null,
      urls: chunk,
      totalUrls: urls.length,
      chunkIndex: i,
      chunkCount: chunks.length,
      generatedAt: new Date().toISOString(),
    };

    const existing = await prisma.pageFactoryInternalSitemap.findFirst({
      where: { projectId: projectId || null, sitemapType, path },
    });

    if (existing) {
      await prisma.pageFactoryInternalSitemap.update({
        where: { id: existing.id },
        data: {
          urlCount: chunk.length,
          status: "ACTIVE",
          generatedJson: JSON.stringify(payload),
          metadataJson: JSON.stringify({ chunkIndex: i, chunkCount: chunks.length }),
          generatedAt: new Date(),
        },
      });
      updated++;
    } else {
      await prisma.pageFactoryInternalSitemap.create({
        data: {
          projectId: projectId || null,
          sitemapType,
          path,
          urlCount: chunk.length,
          status: "ACTIVE",
          generatedJson: JSON.stringify(payload),
          metadataJson: JSON.stringify({ chunkIndex: i, chunkCount: chunks.length }),
          generatedAt: new Date(),
        },
      });
      created++;
    }
  }

  return { created, updated, totalUrls: urls.length };
}

export async function generateAllInternalSitemaps(
  projectId?: string | null
): Promise<{ results: Array<{ type: string; totalUrls: number; created: number; updated: number }> }> {
  const results = [];
  for (const type of SITEMAP_TYPES) {
    const r = await generateInternalSitemap(projectId, type);
    results.push({ type, ...r });
  }
  return { results };
}

export async function getInternalSitemaps(filters: InternalSitemapFilters) {
  const page = filters.page || 1;
  const limit = Math.min(50, filters.limit || 20);
  const where: Record<string, unknown> = {};
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.sitemapType) where.sitemapType = filters.sitemapType;
  if (filters.status) where.status = filters.status;

  const [items, total] = await Promise.all([
    prisma.pageFactoryInternalSitemap.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pageFactoryInternalSitemap.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getInternalSitemapStats(projectId?: string) {
  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;

  const [total, active, stale, error, urlSum] = await Promise.all([
    prisma.pageFactoryInternalSitemap.count({ where }),
    prisma.pageFactoryInternalSitemap.count({ where: { ...where, status: "ACTIVE" } }),
    prisma.pageFactoryInternalSitemap.count({ where: { ...where, status: "STALE" } }),
    prisma.pageFactoryInternalSitemap.count({ where: { ...where, status: "ERROR" } }),
    prisma.pageFactoryInternalSitemap.aggregate({ where, _sum: { urlCount: true } }),
  ]);

  const indexablePages = await getIndexablePublishedPages(projectId);
  return {
    total,
    active,
    stale,
    error,
    totalUrls: urlSum._sum.urlCount || 0,
    indexableUrls: indexablePages.length,
  };
}

export async function markSitemapStale(projectId?: string): Promise<{ updated: number }> {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (projectId) where.projectId = projectId;

  const result = await prisma.pageFactoryInternalSitemap.updateMany({
    where,
    data: { status: "STALE" },
  });
  return { updated: result.count };
}

export async function validateInternalSitemap(id: string) {
  const sitemap = await prisma.pageFactoryInternalSitemap.findUnique({ where: { id } });
  if (!sitemap) throw new Error("Sitemap bulunamadı");

  const issues: string[] = [];
  let payload: InternalSitemapPayload | null = null;

  try {
    payload = JSON.parse(sitemap.generatedJson) as InternalSitemapPayload;
  } catch {
    issues.push("generatedJson geçersiz");
  }

  if (payload) {
    if (payload.urls.length !== sitemap.urlCount) {
      issues.push(`urlCount uyumsuz: kayıt=${sitemap.urlCount}, json=${payload.urls.length}`);
    }
    if (payload.urls.length > SITEMAP_MAX_URLS) {
      issues.push(`URL limiti aşıldı: ${payload.urls.length} > ${SITEMAP_MAX_URLS}`);
    }
    const paths = new Set<string>();
    for (const u of payload.urls) {
      if (paths.has(u.path)) issues.push(`Duplicate URL: ${u.path}`);
      paths.add(u.path);
    }
  }

  const status = issues.length ? "ERROR" : "ACTIVE";
  await prisma.pageFactoryInternalSitemap.update({
    where: { id },
    data: {
      status,
      metadataJson: JSON.stringify({
        ...parseMetadata(sitemap.metadataJson),
        lastValidatedAt: new Date().toISOString(),
        validationIssues: issues,
      }),
    },
  });

  return { id, valid: issues.length === 0, issues, status };
}

export async function getMainInternalSitemapJson(projectId?: string) {
  const where: Record<string, unknown> = {
    sitemapType: "MAIN",
    status: "ACTIVE",
    path: projectId ? `/pf-sitemap/${projectId}/internal.json` : "/pf-sitemap/internal.json",
  };
  if (projectId) where.projectId = projectId;

  const sitemap = await prisma.pageFactoryInternalSitemap.findFirst({
    where,
    orderBy: { generatedAt: "desc" },
  });

  if (sitemap) {
    try {
      return JSON.parse(sitemap.generatedJson) as InternalSitemapPayload;
    } catch {
      /* fall through */
    }
  }

  const urls = await collectUrls(projectId, "MAIN");
  return {
    version: INTERNAL_SITEMAP_VERSION,
    sitemapType: "MAIN",
    projectId: projectId || null,
    urls,
    totalUrls: urls.length,
    chunkIndex: 0,
    chunkCount: 1,
    generatedAt: new Date().toISOString(),
  } satisfies InternalSitemapPayload;
}
