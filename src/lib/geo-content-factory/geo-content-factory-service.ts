import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { generateGeoBlog } from "@/lib/blog-engine/blog-service";
import {
  getAllProvinceNames,
  getDistrictsForProvince,
  getTotalDistrictCount,
  getTotalProvinceCount,
  getTurkiyeIlIlceKaynagi,
} from "@/lib/geo/turkiye-il-ilce-kaynagi";
import { buildGeoInternalLinks, validateGeoContentText } from "./geo-internal-links";
import type {
  GeoBatchResult,
  GeoContentTarget,
  GeoGenerationItemResult,
  GeoGenerationMode,
  GeoJobSettings,
  GeoJobStats,
  GeoPreviewResult,
  GeoSlugMode,
} from "./types";
import type { GeoContentJob, GeoContentJobStatus } from "@prisma/client";

const SECONDS_PER_ITEM = 0.8;
const cancelledJobs = new Set<string>();

function parseSettings(raw: string): GeoJobSettings {
  try {
    return JSON.parse(raw) as GeoJobSettings;
  } catch {
    return { mode: "PROVINCE" };
  }
}

function resolveProvinces(settings: GeoJobSettings): string[] {
  const all = getAllProvinceNames();
  if (!settings.provinces?.length) return all;
  const wanted = new Set(settings.provinces.map((p) => p.toLocaleLowerCase("tr-TR")));
  return all.filter((p) => wanted.has(p.toLocaleLowerCase("tr-TR")));
}

export function buildGeoTargets(mode: GeoGenerationMode, settings: GeoJobSettings = { mode }): GeoContentTarget[] {
  const provinces = resolveProvinces(settings);
  const keyword = "";
  const targets: GeoContentTarget[] = [];

  const addProvince = (province: string, kw = keyword) => {
    targets.push({
      province,
      district: null,
      scope: "PROVINCE",
      slug: slugify(`${province}-${kw}`),
      titleHint: `${province} ${kw}`,
    });
  };

  const addDistrict = (province: string, district: string, kw = keyword) => {
    targets.push({
      province,
      district,
      scope: "DISTRICT",
      slug: slugify(`${district}-${kw}`),
      titleHint: `${district} ${kw}`,
    });
  };

  if (mode === "PROVINCE" || mode === "PROVINCE_AND_DISTRICT") {
    for (const province of provinces) addProvince(province);
  }
  if (mode === "DISTRICT" || mode === "PROVINCE_AND_DISTRICT") {
    for (const province of provinces) {
      for (const district of getDistrictsForProvince(province)) {
        addDistrict(province, district);
      }
    }
  }

  return targets;
}

export function buildGeoTargetsForKeyword(
  keyword: string,
  mode: GeoGenerationMode,
  settings: Partial<GeoJobSettings> = {}
): GeoContentTarget[] {
  const base = buildGeoTargets(mode, { mode, ...settings });
  return base.map((t) => ({
    ...t,
    slug:
      t.scope === "DISTRICT" && t.district
        ? slugify(`${t.district}-${keyword}`)
        : slugify(`${t.province}-${keyword}`),
    titleHint:
      t.scope === "DISTRICT" && t.district
        ? `${t.district} ${keyword}`
        : `${t.province} ${keyword}`,
  }));
}

export function estimateContentCount(
  keyword: string,
  mode: GeoGenerationMode,
  settings: Partial<GeoJobSettings> = {}
): number {
  return buildGeoTargetsForKeyword(keyword, mode, settings).length;
}

export function previewGeoGeneration(opts: {
  keyword: string;
  mode: GeoGenerationMode;
  settings?: Partial<GeoJobSettings>;
}): GeoPreviewResult {
  const targets = buildGeoTargetsForKeyword(opts.keyword, opts.mode, opts.settings);
  const provinceCount = targets.filter((t) => t.scope === "PROVINCE").length;
  const districtCount = targets.filter((t) => t.scope === "DISTRICT").length;
  const sample = targets.slice(0, 8);
  const estimatedSeconds = Math.max(1, Math.round(targets.length * SECONDS_PER_ITEM));

  return {
    keyword: opts.keyword,
    mode: opts.mode,
    totalTargets: targets.length,
    provinceCount,
    districtCount,
    sampleUrls: sample.map((t) => `/blog/${t.slug}`),
    sampleSlugs: sample.map((t) => t.slug),
    estimatedSeconds,
    estimatedMinutes: Math.max(1, Math.ceil(estimatedSeconds / 60)),
  };
}

async function applyGeoInternalLinks(
  postId: string,
  opts: {
    keyword: string;
    province: string;
    district?: string | null;
    category?: string | null;
    slug: string;
  }
) {
  const links = await buildGeoInternalLinks({
    keyword: opts.keyword,
    province: opts.province,
    district: opts.district,
    category: opts.category,
    excludeSlug: opts.slug,
  });
  await prisma.blogPost.update({
    where: { id: postId },
    data: { internalLinksJson: JSON.stringify(links) },
  });
}

async function generateSingleTarget(
  target: GeoContentTarget,
  opts: {
    keyword: string;
    keywordGroup?: string | null;
    category?: string | null;
    autoPublish?: boolean;
    dryRun?: boolean;
    projectId?: string | null;
    dealerId?: string | null;
  }
): Promise<GeoGenerationItemResult> {
  const geoSlugMode: GeoSlugMode = target.scope;
  try {
    const batch = await generateGeoBlog({
      keyword: opts.keyword,
      keywordGroup: opts.keywordGroup || undefined,
      category: opts.category || undefined,
      province: target.province,
      district: target.district || undefined,
      geoSlugMode,
      autoPublish: opts.autoPublish,
      dryRun: opts.dryRun,
      projectId: opts.projectId || undefined,
      dealerId: opts.dealerId || undefined,
    });

    const result = batch.results[0];
    if (!result) {
      return {
        target,
        created: false,
        updated: false,
        published: false,
        slug: target.slug,
        error: "Blog üretilemedi",
      };
    }

    if (!opts.dryRun && result.postId) {
      const post = await prisma.blogPost.findUnique({ where: { id: result.postId } });
      if (post) {
        const contentText = [
          post.title,
          post.excerpt,
          post.contentJson,
          post.seoTitle,
          post.seoDescription,
        ].join(" ");
        const geoCheck = validateGeoContentText(contentText, {
          province: target.province,
          district: target.district,
        });
        if (!geoCheck.valid) {
          // GEO doğrulama uyarıları metadata'ya eklenir; üretim devam eder
          const meta = JSON.parse(post.metadataJson || "{}");
          await prisma.blogPost.update({
            where: { id: post.id },
            data: {
              metadataJson: JSON.stringify({
                ...meta,
                geoValidation: geoCheck.issues,
              }),
            },
          });
        }
        await applyGeoInternalLinks(post.id, {
          keyword: opts.keyword,
          province: target.province,
          district: target.district,
          category: opts.category,
          slug: result.slug,
        });
      }
    }

    return {
      target,
      created: result.created,
      updated: result.updated,
      published: result.status === "PUBLISHED",
      slug: result.slug,
      postId: result.postId,
    };
  } catch (err) {
    return {
      target,
      created: false,
      updated: false,
      published: false,
      slug: target.slug,
      error: err instanceof Error ? err.message : "Bilinmeyen hata",
    };
  }
}

async function runTargets(
  targets: GeoContentTarget[],
  opts: {
    keyword: string;
    keywordGroup?: string | null;
    category?: string | null;
    autoPublish?: boolean;
    dryRun?: boolean;
    projectId?: string | null;
    dealerId?: string | null;
    jobId?: string;
  }
): Promise<GeoBatchResult> {
  const results: GeoGenerationItemResult[] = [];
  let generated = 0;
  let published = 0;
  let failed = 0;

  for (const target of targets) {
    if (opts.jobId && cancelledJobs.has(opts.jobId)) break;

    const item = await generateSingleTarget(target, opts);
    results.push(item);

    if (item.error) failed += 1;
    else {
      generated += 1;
      if (item.published) published += 1;
    }

    if (opts.jobId && !opts.dryRun) {
      await prisma.geoContentJob.update({
        where: { id: opts.jobId },
        data: {
          generatedCount: generated,
          publishedCount: published,
          failedCount: failed,
        },
      });
    }
  }

  return { jobId: opts.jobId, total: targets.length, generated, published, failed, results };
}

export async function generateProvinceBlogs(opts: {
  keyword: string;
  keywordGroup?: string | null;
  category?: string | null;
  autoPublish?: boolean;
  dryRun?: boolean;
  projectId?: string | null;
  dealerId?: string | null;
  provinces?: string[];
  jobId?: string;
}): Promise<GeoBatchResult> {
  const targets = buildGeoTargetsForKeyword(opts.keyword, "PROVINCE", {
    mode: "PROVINCE",
    provinces: opts.provinces,
  });
  return runTargets(targets, opts);
}

export async function generateDistrictBlogs(opts: {
  keyword: string;
  keywordGroup?: string | null;
  category?: string | null;
  autoPublish?: boolean;
  dryRun?: boolean;
  projectId?: string | null;
  dealerId?: string | null;
  provinces?: string[];
  jobId?: string;
}): Promise<GeoBatchResult> {
  const targets = buildGeoTargetsForKeyword(opts.keyword, "DISTRICT", {
    mode: "DISTRICT",
    provinces: opts.provinces,
  });
  return runTargets(targets, opts);
}

export async function generateProvinceAndDistrictBlogs(opts: {
  keyword: string;
  keywordGroup?: string | null;
  category?: string | null;
  autoPublish?: boolean;
  dryRun?: boolean;
  projectId?: string | null;
  dealerId?: string | null;
  provinces?: string[];
  jobId?: string;
}): Promise<GeoBatchResult> {
  const targets = buildGeoTargetsForKeyword(opts.keyword, "PROVINCE_AND_DISTRICT", {
    mode: "PROVINCE_AND_DISTRICT",
    provinces: opts.provinces,
  });
  return runTargets(targets, opts);
}

export async function startGeoJob(opts: {
  keyword: string;
  keywordGroup?: string | null;
  category?: string | null;
  mode: GeoGenerationMode;
  autoPublish?: boolean;
  dryRun?: boolean;
  projectId?: string | null;
  dealerId?: string | null;
  provinces?: string[];
}): Promise<{ job: GeoContentJob; result: GeoBatchResult }> {
  const targets = buildGeoTargetsForKeyword(opts.keyword, opts.mode, {
    mode: opts.mode,
    provinces: opts.provinces,
    autoPublish: opts.autoPublish,
    dryRun: opts.dryRun,
    projectId: opts.projectId,
    dealerId: opts.dealerId,
  });

  const settings: GeoJobSettings = {
    mode: opts.mode,
    autoPublish: opts.autoPublish,
    dryRun: opts.dryRun,
    projectId: opts.projectId,
    dealerId: opts.dealerId,
    provinces: opts.provinces,
  };

  const job = await prisma.geoContentJob.create({
    data: {
      keyword: opts.keyword,
      keywordGroup: opts.keywordGroup || null,
      category: opts.category || null,
      totalTargets: targets.length,
      status: "RUNNING",
      settingsJson: JSON.stringify(settings),
    },
  });

  cancelledJobs.delete(job.id);

  let result: GeoBatchResult;
  try {
    const common = {
      keyword: opts.keyword,
      keywordGroup: opts.keywordGroup,
      category: opts.category,
      autoPublish: opts.autoPublish,
      dryRun: opts.dryRun,
      projectId: opts.projectId,
      dealerId: opts.dealerId,
      provinces: opts.provinces,
      jobId: job.id,
    };

    if (opts.mode === "PROVINCE") result = await generateProvinceBlogs(common);
    else if (opts.mode === "DISTRICT") result = await generateDistrictBlogs(common);
    else result = await generateProvinceAndDistrictBlogs(common);

    const finalStatus: GeoContentJobStatus = cancelledJobs.has(job.id)
      ? "CANCELLED"
      : result.failed > 0 && result.generated === 0
        ? "FAILED"
        : "COMPLETED";

    const updated = await prisma.geoContentJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        generatedCount: result.generated,
        publishedCount: result.published,
        failedCount: result.failed,
      },
    });

    return { job: updated, result };
  } catch (err) {
    const updated = await prisma.geoContentJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        failedCount: targets.length,
      },
    });
    throw Object.assign(err instanceof Error ? err : new Error("GEO iş başarısız"), { job: updated });
  }
}

export async function cancelGeoJob(jobId: string): Promise<GeoContentJob> {
  cancelledJobs.add(jobId);
  return prisma.geoContentJob.update({
    where: { id: jobId },
    data: { status: "CANCELLED" },
  });
}

export async function getGeoJobStats(): Promise<GeoJobStats> {
  const [totalGeoContent, recentJobs, statusGroups] = await Promise.all([
    prisma.blogPost.count({ where: { sourceType: "GEO" } }),
    prisma.geoContentJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.geoContentJob.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const jobsByStatus: Record<string, number> = {};
  for (const row of statusGroups) {
    jobsByStatus[row.status] = row._count._all;
  }

  const completed = jobsByStatus.COMPLETED || 0;
  const failed = jobsByStatus.FAILED || 0;
  const totalFinished = completed + failed;
  const successRate = totalFinished > 0 ? Math.round((completed / totalFinished) * 100) : 100;

  return {
    totalGeoContent,
    totalProvinces: getTotalProvinceCount(),
    totalDistricts: getTotalDistrictCount(),
    successRate,
    recentJobs: recentJobs.map((j) => ({
      id: j.id,
      keyword: j.keyword,
      status: j.status,
      totalTargets: j.totalTargets,
      generatedCount: j.generatedCount,
      publishedCount: j.publishedCount,
      failedCount: j.failedCount,
      createdAt: j.createdAt.toISOString(),
    })),
    jobsByStatus,
  };
}

export async function listGeoJobs(filter?: {
  status?: GeoContentJobStatus;
  limit?: number;
}) {
  return prisma.geoContentJob.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: filter?.limit || 50,
  });
}

export async function getGeoJob(jobId: string) {
  return prisma.geoContentJob.findUnique({ where: { id: jobId } });
}

/** Test / admin: duplicate koruması doğrulama */
export async function findExistingGeoBlog(keyword: string, province: string | null, district: string | null) {
  return prisma.blogPost.findFirst({
    where: {
      keyword,
      province: province || null,
      district: district || null,
      sourceType: "GEO",
    },
  });
}

export function getGeoDataSummary() {
  const kaynak = getTurkiyeIlIlceKaynagi();
  return {
    provinces: kaynak.length,
    districts: kaynak.reduce((s, p) => s + p.districts.length, 0),
  };
}
