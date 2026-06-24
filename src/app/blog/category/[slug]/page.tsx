import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listBlogsByCategory } from "@/lib/blog-engine/blog-directory-service";
import { buildCategoryLandingMetadata } from "@/lib/blog-engine/blog-seo";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { BlogBreadcrumb } from "@/components/blog/BlogBreadcrumb";
import { buildBreadcrumbSchema } from "@/lib/blog-engine/blog-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await listBlogsByCategory(slug, 1, 1);
  if (!result.category) return { title: "Kategori bulunamadı" };
  return buildCategoryLandingMetadata(result.category, result.total);
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const result = await listBlogsByCategory(slug, page, 12);

  if (!result.category) notFound();

  const breadcrumbs = [
    { name: "Ana Sayfa", href: "/" },
    { name: "Blog", href: "/blog" },
    { name: result.category },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <BlogBreadcrumb items={breadcrumbs} schema={buildBreadcrumbSchema(breadcrumbs)} />
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ena-text">{result.category}</h1>
        <p className="mt-2 text-ena-light/70">
          {result.category} kategorisinde {result.total} blog yazısı
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
      <BlogPagination
        current={result.page}
        totalPages={result.totalPages}
        basePath={`/blog/category/${slug}`}
      />
    </div>
  );
}
