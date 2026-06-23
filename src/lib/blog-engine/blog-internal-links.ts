import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { BlogInternalLink } from "./blog-types";

export async function suggestInternalLinks(opts: {
  keyword: string;
  category?: string | null;
  province?: string | null;
  productId?: string | null;
  excludeSlug?: string;
}): Promise<BlogInternalLink[]> {
  const links: BlogInternalLink[] = [];

  if (opts.productId) {
    const product = await prisma.productUniverse.findUnique({
      where: { id: opts.productId },
      select: { id: true, normalizedName: true, slug: true, categoryPath: true },
    });
    if (product) {
      links.push({
        type: "product",
        title: product.normalizedName,
        href: `/products/${product.slug || slugify(product.normalizedName)}`,
        reason: "Kaynak ürün",
      });
    }
  }

  const relatedProducts = await prisma.productUniverse.findMany({
    where: {
      ...(opts.category ? { categoryPath: { contains: opts.category } } : {}),
      ...(opts.keyword ? { OR: [{ normalizedName: { contains: opts.keyword } }, { categoryPath: { contains: opts.keyword } }] } : {}),
    },
    take: 3,
    select: { normalizedName: true, slug: true },
  });
  for (const p of relatedProducts) {
    if (links.some((l) => l.title === p.normalizedName)) continue;
    links.push({
      type: "product",
      title: p.normalizedName,
      href: `/products/${p.slug || slugify(p.normalizedName)}`,
      reason: "İlgili ürün",
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
    take: 3,
    select: { title: true, slug: true },
  });
  for (const b of relatedBlogs) {
    links.push({
      type: "blog",
      title: b.title,
      href: `/blog/${b.slug}`,
      reason: "İlgili blog",
    });
  }

  if (opts.category) {
    links.push({
      type: "category",
      title: opts.category,
      href: `/products?category=${encodeURIComponent(opts.category)}`,
      reason: "İlgili kategori",
    });
  }

  return links.slice(0, 8);
}
