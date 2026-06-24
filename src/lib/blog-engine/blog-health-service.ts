import type { BlogPost } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseJson } from "./blog-service";
import type { BlogFaqItem } from "./blog-types";

export type BlogHealthIssue = {
  id: string;
  severity: "error" | "warning";
  label: string;
  message: string;
};

export type BlogHealthResult = {
  postId: string;
  slug: string;
  title: string;
  status: string;
  healthy: boolean;
  seoScore: number;
  geoScore: number;
  qualityScore: number;
  issues: BlogHealthIssue[];
};

export type BlogHealthReport = {
  checked: number;
  healthy: number;
  unhealthy: number;
  avgSeoScore: number;
  avgGeoScore: number;
  avgQualityScore: number;
  items: BlogHealthResult[];
};

const SEO_THRESHOLD = 50;
const GEO_THRESHOLD = 40;
const QUALITY_THRESHOLD = 60;

export function runBlogHealthCheck(post: BlogPost): BlogHealthResult {
  const issues: BlogHealthIssue[] = [];

  if (!post.seoTitle?.trim()) {
    issues.push({ id: "meta_title", severity: "error", label: "Meta title", message: "Meta title eksik" });
  }
  if (!post.seoDescription?.trim()) {
    issues.push({ id: "meta_desc", severity: "error", label: "Meta description", message: "Meta description eksik" });
  }

  const faq = parseJson<BlogFaqItem[]>(post.faqJson, []);
  if (faq.length < 3) {
    issues.push({ id: "faq", severity: "error", label: "FAQ", message: "FAQ en az 3 soru içermeli" });
  }

  if (post.seoScore < SEO_THRESHOLD) {
    issues.push({
      id: "seo_score",
      severity: "warning",
      label: "SEO skoru",
      message: `SEO skoru düşük (${post.seoScore} < ${SEO_THRESHOLD})`,
    });
  }
  if (post.geoScore < GEO_THRESHOLD) {
    issues.push({
      id: "geo_score",
      severity: "warning",
      label: "GEO skoru",
      message: `GEO skoru düşük (${post.geoScore} < ${GEO_THRESHOLD})`,
    });
  }
  if (post.qualityScore < QUALITY_THRESHOLD) {
    issues.push({
      id: "quality_score",
      severity: "warning",
      label: "Kalite skoru",
      message: `Kalite skoru düşük (${post.qualityScore} < ${QUALITY_THRESHOLD})`,
    });
  }

  const hasErrors = issues.some((i) => i.severity === "error");

  return {
    postId: post.id,
    slug: post.slug,
    title: post.title,
    status: post.status,
    healthy: !hasErrors && issues.length === 0,
    seoScore: post.seoScore,
    geoScore: post.geoScore,
    qualityScore: post.qualityScore,
    issues,
  };
}

export async function getBlogHealthReport(opts?: {
  status?: string;
  limit?: number;
}): Promise<BlogHealthReport> {
  const limit = Math.min(200, opts?.limit || 100);
  const posts = await prisma.blogPost.findMany({
    where: opts?.status ? { status: opts.status as BlogPost["status"] } : {},
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const items = posts.map(runBlogHealthCheck);
  const healthy = items.filter((i) => i.healthy).length;
  const sum = items.reduce(
    (acc, i) => ({
      seo: acc.seo + i.seoScore,
      geo: acc.geo + i.geoScore,
      quality: acc.quality + i.qualityScore,
    }),
    { seo: 0, geo: 0, quality: 0 }
  );
  const n = items.length || 1;

  return {
    checked: items.length,
    healthy,
    unhealthy: items.length - healthy,
    avgSeoScore: Math.round(sum.seo / n),
    avgGeoScore: Math.round(sum.geo / n),
    avgQualityScore: Math.round(sum.quality / n),
    items,
  };
}
