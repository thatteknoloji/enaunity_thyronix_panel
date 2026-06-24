import type { Metadata } from "next";
import type { BlogPost } from "@prisma/client";
import type { BlogFaqItem } from "./blog-types";
import { categoryToSlug, provinceToSlug } from "./blog-directory-service";

export function getBlogSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://enaunity.com";
}

export function blogAbsoluteUrl(path: string): string {
  const base = getBlogSiteUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildBlogPostMetadata(post: BlogPost): Metadata {
  const url = blogAbsoluteUrl(`/blog/${post.slug}`);
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      siteName: "ENA",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function buildBlogPostingSchema(opts: {
  post: BlogPost;
  faq?: BlogFaqItem[];
}): Record<string, unknown> {
  const url = blogAbsoluteUrl(`/blog/${opts.post.slug}`);
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: opts.post.title,
      description: opts.post.seoDescription || opts.post.excerpt,
      url,
      datePublished: opts.post.publishedAt?.toISOString(),
      dateModified: opts.post.updatedAt.toISOString(),
      author: { "@type": "Organization", name: "ENA" },
      publisher: { "@type": "Organization", name: "ENA" },
      keywords: opts.post.keyword,
      articleSection: opts.post.category || undefined,
    },
  ];

  if (opts.faq?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: opts.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export type BreadcrumbItem = { name: string; href?: string };

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.href ? { item: blogAbsoluteUrl(item.href) } : {}),
    })),
  };
}

export function buildCategoryLandingMetadata(category: string, count: number): Metadata {
  const title = `${category} Blog Yazıları | ENA Blog`;
  const description = `${category} kategorisinde ${count} özgün blog yazısı. SEO, GEO ve AEO odaklı rehberler.`;
  return {
    title,
    description,
    alternates: { canonical: blogAbsoluteUrl(`/blog/category/${categoryToSlug(category)}`) },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export function buildGeoLandingMetadata(province: string, count: number): Metadata {
  const title = `${province} Blog ve Rehberler | ENA Blog`;
  const description = `${province} için ${count} lokasyon odaklı blog içeriği. Yerel SEO ve GEO rehberleri.`;
  return {
    title,
    description,
    alternates: { canonical: blogAbsoluteUrl(`/blog/geo/${provinceToSlug(province)}`) },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export function buildTagLandingMetadata(tag: string, count: number): Metadata {
  const title = `#${tag} | ENA Blog`;
  const description = `${tag} etiketiyle ${count} blog yazısı.`;
  return {
    title,
    description,
    alternates: { canonical: blogAbsoluteUrl(`/blog/tag/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, "-"))}`) },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export function buildSearchMetadata(query: string): Metadata {
  const title = query ? `"${query}" arama sonuçları | ENA Blog` : "Blog Arama | ENA";
  const description = query
    ? `"${query}" için blog arama sonuçları.`
    : "ENA blog içeriklerinde arama yapın.";
  return { title, description };
}
