import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { getAllProvinceNames } from "@/lib/geo/turkiye-il-ilce-kaynagi";
import type { GeoGeoInternalLinksPayload } from "./types";

const NEIGHBOR_PROVINCES: Record<string, string[]> = {
  İstanbul: ["Ankara", "İzmir", "Bursa", "Kocaeli"],
  Ankara: ["İstanbul", "İzmir", "Konya", "Eskişehir"],
  İzmir: ["İstanbul", "Ankara", "Manisa", "Aydın"],
  Bursa: ["İstanbul", "Kocaeli", "Balıkesir", "Ankara"],
};

export function pickNeighborProvinces(province: string, limit = 4): string[] {
  if (NEIGHBOR_PROVINCES[province]) return NEIGHBOR_PROVINCES[province].slice(0, limit);
  const all = getAllProvinceNames().filter((p) => p !== province);
  return all.slice(0, limit);
}

export async function buildGeoInternalLinks(opts: {
  keyword: string;
  province: string;
  district?: string | null;
  category?: string | null;
  excludeSlug?: string;
}): Promise<GeoGeoInternalLinksPayload> {
  const neighbors = pickNeighborProvinces(opts.province);
  const relatedGeoBlogs: GeoGeoInternalLinksPayload["relatedGeoBlogs"] = [];

  for (const neighbor of neighbors) {
    const slug = slugify(`${neighbor}-${opts.keyword}`);
    relatedGeoBlogs.push({
      title: `${neighbor} ${opts.keyword}`,
      href: `/blog/${slug}`,
      reason: "İlgili şehir GEO blog önerisi",
    });
  }

  const dbGeoBlogs = await prisma.blogPost.findMany({
    where: {
      sourceType: "GEO",
      keyword: opts.keyword,
      status: "PUBLISHED",
      ...(opts.excludeSlug ? { NOT: { slug: opts.excludeSlug } } : {}),
      OR: [{ province: { in: neighbors } }, { province: opts.province }],
    },
    take: 6,
    select: { title: true, slug: true, province: true },
  });

  for (const blog of dbGeoBlogs) {
    if (relatedGeoBlogs.some((l) => l.href === `/blog/${blog.slug}`)) continue;
    relatedGeoBlogs.push({
      title: blog.title,
      href: `/blog/${blog.slug}`,
      reason: `${blog.province || "GEO"} blog önerisi`,
    });
  }

  const relatedCategoryBlogs: GeoGeoInternalLinksPayload["relatedCategoryBlogs"] = [];
  if (opts.category) {
    relatedCategoryBlogs.push({
      title: opts.category,
      href: `/blog/category/${slugify(opts.category)}`,
      reason: "İlgili kategori hub",
    });
    const catBlogs = await prisma.blogPost.findMany({
      where: {
        category: { contains: opts.category },
        status: "PUBLISHED",
        ...(opts.excludeSlug ? { NOT: { slug: opts.excludeSlug } } : {}),
      },
      take: 4,
      select: { title: true, slug: true },
    });
    for (const b of catBlogs) {
      relatedCategoryBlogs.push({
        title: b.title,
        href: `/blog/${b.slug}`,
        reason: "Kategori blog önerisi",
      });
    }
  }

  const relatedProducts: GeoGeoInternalLinksPayload["relatedProducts"] = [];
  const products = await prisma.productUniverse.findMany({
    where: opts.keyword
      ? {
          OR: [
            { normalizedName: { contains: opts.keyword } },
            { categoryPath: { contains: opts.keyword } },
          ],
        }
      : {},
    take: 6,
    select: { normalizedName: true, slug: true },
  });
  for (const p of products) {
    relatedProducts.push({
      title: p.normalizedName,
      href: `/products/${p.slug || slugify(p.normalizedName)}`,
      reason: "İlgili ürün",
    });
  }

  const relatedPages: GeoGeoInternalLinksPayload["relatedPages"] = [];
  try {
    const pages = await prisma.pageFactoryPublishedPage.findMany({
      where: {
        status: { in: ["PUBLISHED_INTERNAL", "STAGED"] },
        OR: [
          { title: { contains: opts.keyword } },
          { title: { contains: opts.province } },
          ...(opts.district ? [{ title: { contains: opts.district } }] : []),
        ],
      },
      take: 6,
      select: { title: true, path: true, slug: true },
    });
    for (const page of pages) {
      relatedPages.push({
        title: page.title,
        href: page.path || `/p/${page.slug}`,
        reason: "İlgili sayfa",
      });
    }
  } catch {
    /* Page Factory yoksa atla */
  }

  return {
    relatedGeoBlogs: relatedGeoBlogs.slice(0, 8),
    relatedCategoryBlogs: relatedCategoryBlogs.slice(0, 6),
    relatedProducts: relatedProducts.slice(0, 8),
    relatedPages: relatedPages.slice(0, 8),
  };
}

export function validateGeoContentText(
  text: string,
  opts: { province: string; district?: string | null }
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const lower = text.toLocaleLowerCase("tr-TR");
  if (!lower.includes(opts.province.toLocaleLowerCase("tr-TR"))) {
    issues.push("İl adı içerikte geçmiyor");
  }
  if (opts.district && !lower.includes(opts.district.toLocaleLowerCase("tr-TR"))) {
    issues.push("İlçe adı içerikte geçmiyor");
  }
  const localSignals = ["bölge", "yerel", "bölgesel", "ihtiyaç"];
  if (!localSignals.some((s) => lower.includes(s))) {
    issues.push("Yerel kullanım ifadeleri zayıf");
  }
  return { valid: issues.length === 0, issues };
}
