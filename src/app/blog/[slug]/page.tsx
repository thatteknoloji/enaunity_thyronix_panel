import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedBlogBySlug, parseJson } from "@/lib/blog-engine/blog-service";
import type { BlogContentPayload, BlogFaqItem, BlogInternalLink } from "@/lib/blog-engine/blog-types";
import { BlogPostRenderer } from "@/components/blog/BlogPostRenderer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogBySlug(slug);
  if (!post) return { title: "Blog bulunamadı" };
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
  };
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
  const internalLinks = parseJson<BlogInternalLink[]>(post.internalLinksJson, []);
  const schema = parseJson<Record<string, unknown>>(post.schemaJson, {});

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <BlogPostRenderer
        title={post.title}
        excerpt={post.excerpt}
        content={content}
        faq={faq}
        internalLinks={internalLinks}
        publishedAt={post.publishedAt?.toISOString()}
        schema={schema}
      />
    </div>
  );
}
