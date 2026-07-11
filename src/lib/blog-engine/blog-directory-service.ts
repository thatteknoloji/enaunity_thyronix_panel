import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { getBlogGeoProvinces } from "@/lib/geo/turkiye-geo-source";
import type { BlogPost } from "@prisma/client";

/** SEO-friendly il slug haritası */
const BLOG_PROVINCE_SLUGS: Record<string, string> = {
  İstanbul: "istanbul",
  Ankara: "ankara",
  İzmir: "izmir",
  Bursa: "bursa",
  Antalya: "antalya",
  Konya: "konya",
  Adana: "adana",
  Gaziantep: "gaziantep",
  Kocaeli: "kocaeli",
  Mersin: "mersin",
};

const SLUG_TO_PROVINCE = Object.fromEntries(
  Object.entries(BLOG_PROVINCE_SLUGS).map(([name, slug]) => [slug, name])
);

export type BlogCardData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string | null;
  province: string | null;
  publishedAt: Date | null;
  qualityScore: number;
  seoScore: number;
};

function toCard(post: BlogPost): BlogCardData {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    category: post.category,
    province: post.province,
    publishedAt: post.publishedAt,
    qualityScore: post.qualityScore,
    seoScore: post.seoScore,
  };
}

export function parseTagsJson(raw: string): string[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function categoryToSlug(category: string): string {
  return slugify(category);
}

export function slugToCategoryMatch(slug: string): string {
  return slug.replace(/-/g, " ");
}

export function provinceToSlug(province: string): string {
  return BLOG_PROVINCE_SLUGS[province] || slugify(province);
}

export async function resolveProvinceFromSlug(slug: string): Promise<string | null> {
  const normalized = slug.toLowerCase();
  if (SLUG_TO_PROVINCE[normalized]) return SLUG_TO_PROVINCE[normalized];
  const fromList = getBlogGeoProvinces().find((p) => provinceToSlug(p) === normalized || slugify(p) === normalized);
  if (fromList) return fromList;
  const rows = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", province: { not: null } },
    select: { province: true },
    distinct: ["province"],
  });
  return rows.find((r) => r.province && slugify(r.province) === normalized)?.province || null;
}

export async function listPublishedBlogPosts(opts: {
  page?: number;
  limit?: number;
  orderBy?: "recent" | "popular";
}) {
  const page = opts.page || 1;
  const limit = Math.min(50, opts.limit || 12);
  const orderBy =
    opts.orderBy === "popular"
      ? [{ qualityScore: "desc" as const }, { seoScore: "desc" as const }]
      : [{ publishedAt: "desc" as const }];

  const where = { status: "PUBLISHED" as const };
  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    items: items.map(toCard),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getBlogDirectoryData(page = 1, limit = 12) {
  const [recent, popular, categories, geoHubs] = await Promise.all([
    listPublishedBlogPosts({ page, limit, orderBy: "recent" }),
    listPublishedBlogPosts({ page: 1, limit: 6, orderBy: "popular" }),
    getBlogCategoryHubs(),
    getBlogGeoHubs(),
  ]);
  return { recent, popular, categories, geoHubs };
}

export async function getBlogCategoryHubs() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", category: { not: null } },
    select: { category: true },
  });
  const counts = new Map<string, number>();
  for (const p of posts) {
    if (!p.category) continue;
    counts.set(p.category, (counts.get(p.category) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: categoryToSlug(name), count }))
    .sort((a, b) => b.count - a.count);
}

export async function getBlogGeoHubs() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", province: { not: null } },
    select: { province: true },
  });
  const counts = new Map<string, number>();
  for (const p of posts) {
    if (!p.province) continue;
    counts.set(p.province, (counts.get(p.province) || 0) + 1);
  }
  const supported = getBlogGeoProvinces();
  return supported.map((name) => ({
    name,
    slug: provinceToSlug(name),
    count: counts.get(name) || 0,
  }));
}

export async function getBlogTagHubs() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    select: { tagsJson: true },
  });
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const tag of parseTagsJson(p.tagsJson)) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count);
}

export async function listBlogsByCategory(categorySlug: string, page = 1, limit = 12) {
  const hubs = await getBlogCategoryHubs();
  const hub = hubs.find((h) => h.slug === categorySlug);
  if (!hub) return { items: [], total: 0, page, limit, totalPages: 0, category: null };

  const where = { status: "PUBLISHED" as const, category: hub.name };
  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    items: items.map(toCard),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    category: hub.name,
  };
}

export async function listBlogsByProvince(provinceSlug: string, page = 1, limit = 12) {
  const province = await resolveProvinceFromSlug(provinceSlug);
  if (!province) return { items: [], total: 0, page, limit, totalPages: 0, province: null };

  const where = { status: "PUBLISHED" as const, province };
  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    items: items.map(toCard),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    province,
  };
}

export async function listBlogsByTag(tagSlug: string, page = 1, limit = 12) {
  const hubs = await getBlogTagHubs();
  const hub = hubs.find((h) => h.slug === tagSlug);
  if (!hub) return { items: [], total: 0, page, limit, totalPages: 0, tag: null };

  const allPosts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });
  const filtered = allPosts.filter((p) => parseTagsJson(p.tagsJson).includes(hub.name));
  const total = filtered.length;
  const slice = filtered.slice((page - 1) * limit, page * limit);

  return {
    items: slice.map(toCard),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    tag: hub.name,
  };
}

export async function searchBlogPosts(q: string, page = 1, limit = 12) {
  const query = q.trim();
  if (!query) {
    return { items: [], total: 0, page, limit, totalPages: 0, query };
  }

  const allPosts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  const lower = query.toLowerCase();
  const filtered = allPosts.filter((p) => {
    const tags = parseTagsJson(p.tagsJson).join(" ").toLowerCase();
    return (
      p.title.toLowerCase().includes(lower) ||
      p.excerpt.toLowerCase().includes(lower) ||
      p.keyword.toLowerCase().includes(lower) ||
      tags.includes(lower)
    );
  });

  const total = filtered.length;
  const slice = filtered.slice((page - 1) * limit, page * limit);

  return {
    items: slice.map(toCard),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    query,
  };
}

export async function getGeoLandingFaq(province: string) {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", province },
    take: 5,
    select: { faqJson: true },
  });
  const faq: Array<{ question: string; answer: string }> = [];
  for (const p of posts) {
    try {
      const items = JSON.parse(p.faqJson || "[]");
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item?.question && faq.length < 8) faq.push(item);
        }
      }
    } catch {
      /* skip */
    }
  }
  if (faq.length === 0) {
    faq.push(
      {
        question: `${province} bölgesinde hangi içerikler var?`,
        answer: `${province} için lokasyon odaklı blog yazıları ve rehberler bu sayfada listelenir.`,
      },
      {
        question: `${province} GEO içerikleri ne işe yarar?`,
        answer: "Yerel SEO ve bölgesel arama niyetine uygun özgün içerikler sunar.",
      }
    );
  }
  return faq;
}
