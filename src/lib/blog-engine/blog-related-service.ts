import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { BlogPost } from "@prisma/client";
import type { BlogInternalLinkSuggestion, BlogInternalLinksPayload } from "./blog-types";
import { parseTagsJson } from "./blog-directory-service";

const EMPTY: BlogInternalLinksPayload = {
  relatedPages: [],
  relatedProducts: [],
  relatedBlogs: [],
  relatedCategories: [],
};

function scoreBlogMatch(
  candidate: BlogPost,
  post: BlogPost,
  sharedTags: string[]
): number {
  let score = 0;
  if (post.category && candidate.category === post.category) score += 40;
  if (post.keywordGroup && candidate.keywordGroup === post.keywordGroup) score += 35;
  if (post.province && candidate.province === post.province) score += 25;
  if (post.district && candidate.district === post.district) score += 20;
  if (sharedTags.length > 0) score += sharedTags.length * 10;
  if (post.keyword && candidate.keyword.includes(post.keyword)) score += 10;
  return score;
}

export async function resolveRelatedBlogs(
  post: BlogPost,
  limit = 6
): Promise<BlogInternalLinkSuggestion[]> {
  const postTags = parseTagsJson(post.tagsJson);
  const candidates = await prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      NOT: { id: post.id },
      OR: [
        ...(post.category ? [{ category: post.category }] : []),
        ...(post.keywordGroup ? [{ keywordGroup: post.keywordGroup }] : []),
        ...(post.province ? [{ province: post.province }] : []),
        ...(post.district ? [{ district: post.district }] : []),
        ...(post.keyword ? [{ keyword: { contains: post.keyword } }] : []),
      ],
    },
    take: 40,
    orderBy: { publishedAt: "desc" },
  });

  const scored = candidates
    .map((c) => {
      const cTags = parseTagsJson(c.tagsJson);
      const shared = postTags.filter((t) => cTags.includes(t));
      return { post: c, score: scoreBlogMatch(c, post, shared) };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ post: p, score }) => ({
    title: p.title,
    href: `/blog/${p.slug}`,
    reason: `İlgili blog (skor: ${score})`,
  }));
}

export async function resolveRelatedProducts(
  post: BlogPost,
  limit = 8
): Promise<BlogInternalLinkSuggestion[]> {
  const results: BlogInternalLinkSuggestion[] = [];
  const seen = new Set<string>();

  if (post.sourceReferenceId && post.sourceType === "PRODUCT") {
    const source = await prisma.productUniverse.findUnique({
      where: { id: post.sourceReferenceId },
      select: { normalizedName: true, slug: true },
    });
    if (source) {
      results.push({
        title: source.normalizedName,
        href: `/products/${source.slug || slugify(source.normalizedName)}`,
        reason: "Kaynak ürün",
      });
      seen.add(source.normalizedName);
    }
  }

  const products = await prisma.productUniverse.findMany({
    where: {
      OR: [
        ...(post.keyword ? [{ normalizedName: { contains: post.keyword } }] : []),
        ...(post.category ? [{ categoryPath: { contains: post.category } }] : []),
      ],
    },
    take: limit + 4,
    select: { normalizedName: true, slug: true, categoryPath: true },
    orderBy: { qualityScore: "desc" },
  });

  for (const p of products) {
    if (results.length >= limit) break;
    if (seen.has(p.normalizedName)) continue;
    seen.add(p.normalizedName);
    results.push({
      title: p.normalizedName,
      href: `/products/${p.slug || slugify(p.normalizedName)}`,
      reason: post.category && p.categoryPath.includes(post.category) ? "Kategori eşleşmesi" : "Keyword eşleşmesi",
    });
  }

  return results.slice(0, limit);
}

export async function resolveRelatedPages(
  post: BlogPost,
  limit = 8
): Promise<BlogInternalLinkSuggestion[]> {
  try {
    const pages = await prisma.pageFactoryPublishedPage.findMany({
      where: {
        status: { in: ["PUBLISHED_INTERNAL", "STAGED"] },
        ...(post.projectId ? { projectId: post.projectId } : {}),
        OR: [
          ...(post.keyword
            ? [
                { title: { contains: post.keyword } },
                { metaTitle: { contains: post.keyword } },
                { slug: { contains: slugify(post.keyword) } },
              ]
            : []),
          ...(post.category ? [{ title: { contains: post.category } }] : []),
          ...(post.province ? [{ title: { contains: post.province } }] : []),
        ],
      },
      take: limit,
      select: { title: true, path: true, slug: true },
      orderBy: { publishScore: "desc" },
    });

    return pages.map((page) => ({
      title: page.title,
      href: page.path || `/p/${page.slug}`,
      reason: "Page Factory sayfası",
    }));
  } catch {
    return [];
  }
}

export async function resolveRelatedContentForPost(
  post: BlogPost
): Promise<BlogInternalLinksPayload> {
  const [relatedBlogs, relatedProducts, relatedPages] = await Promise.all([
    resolveRelatedBlogs(post, 6),
    resolveRelatedProducts(post, 8),
    resolveRelatedPages(post, 8),
  ]);

  const relatedCategories: BlogInternalLinkSuggestion[] = [];
  if (post.category) {
    relatedCategories.push({
      title: post.category,
      href: `/blog/category/${slugify(post.category)}`,
      reason: "Kategori hub",
    });
  }

  return { relatedBlogs, relatedProducts, relatedPages, relatedCategories };
}

export { EMPTY as EMPTY_RELATED_LINKS };
