import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { BlogInternalLinksPayload } from "./blog-types";

const EMPTY_LINKS: BlogInternalLinksPayload = {
  relatedPages: [],
  relatedProducts: [],
  relatedBlogs: [],
  relatedCategories: [],
};

export async function suggestInternalLinks(opts: {
  keyword: string;
  category?: string | null;
  province?: string | null;
  productId?: string | null;
  projectId?: string | null;
  excludeSlug?: string;
}): Promise<BlogInternalLinksPayload> {
  const result: BlogInternalLinksPayload = {
    relatedPages: [],
    relatedProducts: [],
    relatedBlogs: [],
    relatedCategories: [],
  };

  if (opts.productId) {
    const product = await prisma.productUniverse.findUnique({
      where: { id: opts.productId },
      select: { id: true, normalizedName: true, slug: true, categoryPath: true },
    });
    if (product) {
      result.relatedProducts.push({
        title: product.normalizedName,
        href: `/products/${product.slug || slugify(product.normalizedName)}`,
        reason: "Kaynak ürün",
      });
    }
  }

  const relatedProducts = await prisma.productUniverse.findMany({
    where: {
      ...(opts.category ? { categoryPath: { contains: opts.category } } : {}),
      ...(opts.keyword
        ? {
            OR: [
              { normalizedName: { contains: opts.keyword } },
              { categoryPath: { contains: opts.keyword } },
            ],
          }
        : {}),
    },
    take: 8,
    select: { normalizedName: true, slug: true },
  });
  for (const p of relatedProducts) {
    if (result.relatedProducts.some((l) => l.title === p.normalizedName)) continue;
    result.relatedProducts.push({
      title: p.normalizedName,
      href: `/products/${p.slug || slugify(p.normalizedName)}`,
      reason: "İlgili ürün önerisi",
    });
  }

  const relatedBlogs = await prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      ...(opts.excludeSlug ? { NOT: { slug: opts.excludeSlug } } : {}),
      OR: [
        { keyword: { contains: opts.keyword } },
        ...(opts.category ? [{ category: { contains: opts.category } }] : []),
        ...(opts.province ? [{ province: opts.province }] : []),
      ],
    },
    take: 6,
    select: { title: true, slug: true },
  });
  for (const b of relatedBlogs) {
    result.relatedBlogs.push({
      title: b.title,
      href: `/blog/${b.slug}`,
      reason: "İlgili blog önerisi",
    });
  }

  if (opts.category) {
    result.relatedCategories.push({
      title: opts.category,
      href: `/products?category=${encodeURIComponent(opts.category)}`,
      reason: "İlgili kategori önerisi",
    });
  }

  try {
    const relatedPages = await prisma.pageFactoryPublishedPage.findMany({
      where: {
        status: { in: ["PUBLISHED_INTERNAL", "STAGED"] },
        ...(opts.projectId ? { projectId: opts.projectId } : {}),
        ...(opts.keyword || opts.category
          ? {
              OR: [
                ...(opts.keyword
                  ? [
                      { title: { contains: opts.keyword } },
                      { metaTitle: { contains: opts.keyword } },
                      { slug: { contains: slugify(opts.keyword) } },
                    ]
                  : []),
                ...(opts.category ? [{ title: { contains: opts.category } }] : []),
                ...(opts.province ? [{ title: { contains: opts.province } }] : []),
              ],
            }
          : {}),
      },
      take: 8,
      select: { title: true, path: true, slug: true },
      orderBy: { publishScore: "desc" },
    });
    for (const page of relatedPages) {
      result.relatedPages.push({
        title: page.title,
        href: page.path || `/p/${page.slug}`,
        reason: "Page Factory sayfa önerisi",
      });
    }
  } catch {
    /* Page Factory tablosu yoksa atla */
  }

  result.relatedProducts = result.relatedProducts.slice(0, 8);
  result.relatedBlogs = result.relatedBlogs.slice(0, 6);
  result.relatedPages = result.relatedPages.slice(0, 8);
  result.relatedCategories = result.relatedCategories.slice(0, 3);

  return result;
}

/** Eski düz dizi formatını yeni yapıya veya tersine dönüştürür */
export function normalizeInternalLinks(raw: unknown): BlogInternalLinksPayload {
  if (!raw) return { ...EMPTY_LINKS };
  if (Array.isArray(raw)) {
    const payload: BlogInternalLinksPayload = { ...EMPTY_LINKS };
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const link = item as { type?: string; title?: string; href?: string; reason?: string };
      if (!link.title || !link.href) continue;
      const entry = { title: link.title, href: link.href, reason: link.reason || "" };
      switch (link.type) {
        case "product":
          payload.relatedProducts.push(entry);
          break;
        case "blog":
          payload.relatedBlogs.push(entry);
          break;
        case "category":
          payload.relatedCategories.push(entry);
          break;
        case "page":
          payload.relatedPages.push(entry);
          break;
        default:
          payload.relatedBlogs.push(entry);
      }
    }
    return payload;
  }
  const obj = raw as Partial<BlogInternalLinksPayload>;
  return {
    relatedPages: obj.relatedPages || [],
    relatedProducts: obj.relatedProducts || [],
    relatedBlogs: obj.relatedBlogs || [],
    relatedCategories: obj.relatedCategories || [],
    relatedGeoBlogs: obj.relatedGeoBlogs || [],
    relatedCategoryBlogs: obj.relatedCategoryBlogs || [],
  };
}

/** Renderer için tüm önerileri düz liste olarak döner (otomatik link yazımı yok) */
export function flattenInternalLinkSuggestions(links: BlogInternalLinksPayload) {
  return [
    ...links.relatedPages.map((l) => ({ ...l, group: "page" as const })),
    ...links.relatedProducts.map((l) => ({ ...l, group: "product" as const })),
    ...links.relatedBlogs.map((l) => ({ ...l, group: "blog" as const })),
    ...links.relatedCategories.map((l) => ({ ...l, group: "category" as const })),
  ];
}
