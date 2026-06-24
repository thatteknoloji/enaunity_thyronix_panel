import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedBlogBySlug, parseJson } from "@/lib/blog-engine/blog-service";
import type { BlogContentPayload, BlogFaqItem } from "@/lib/blog-engine/blog-types";
import { BlogPostRenderer } from "@/components/blog/BlogPostRenderer";
import { BlogBreadcrumb } from "@/components/blog/BlogBreadcrumb";
import { resolveRelatedContentForPost } from "@/lib/blog-engine/blog-related-service";
import { categoryToSlug } from "@/lib/blog-engine/blog-directory-service";
import {
  buildBlogPostMetadata,
  buildBlogPostingSchema,
  buildBreadcrumbSchema,
  type BreadcrumbItem,
} from "@/lib/blog-engine/blog-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogBySlug(slug);
  if (!post) return { title: "Blog bulunamadı" };
  return buildBlogPostMetadata(post);
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogBySlug(slug);
  if (!post) notFound();

  const content = parseJson<BlogContentPayload>(post.contentJson, {
    version: "ENA_BLOG_ENGINE_V1",
    h1: post.title,
    intro: post.excerpt,
    sections: [],
    conclusion: "",
  });
  const faq = parseJson<BlogFaqItem[]>(post.faqJson, []);
  const related = await resolveRelatedContentForPost(post);
  const schema = buildBlogPostingSchema({ post, faq });

  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Ana Sayfa", href: "/" },
    { name: "Blog", href: "/blog" },
  ];
  if (post.category) {
    breadcrumbs.push({
      name: post.category,
      href: `/blog/category/${categoryToSlug(post.category)}`,
    });
  }
  breadcrumbs.push({ name: post.title });

  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbs);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <BlogBreadcrumb items={breadcrumbs} schema={breadcrumbSchema} />
      <BlogPostRenderer
        title={post.title}
        excerpt={post.excerpt}
        content={content}
        faq={faq}
        related={related}
        publishedAt={post.publishedAt?.toISOString()}
        schema={schema}
        category={post.category}
      />
    </div>
  );
}
