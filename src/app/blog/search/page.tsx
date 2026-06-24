import Link from "next/link";
import { searchBlogPosts } from "@/lib/blog-engine/blog-directory-service";
import { buildSearchMetadata, buildBreadcrumbSchema } from "@/lib/blog-engine/blog-seo";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { BlogBreadcrumb } from "@/components/blog/BlogBreadcrumb";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<ReturnType<typeof buildSearchMetadata>> {
  const sp = await searchParams;
  return buildSearchMetadata(sp.q || "");
}

export default async function BlogSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.q || "";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const result = await searchBlogPosts(query, page, 12);

  const breadcrumbs = [
    { name: "Ana Sayfa", href: "/" },
    { name: "Blog", href: "/blog" },
    { name: "Arama" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <BlogBreadcrumb items={breadcrumbs} schema={buildBreadcrumbSchema(breadcrumbs)} />
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ena-text">Blog Arama</h1>
        <form method="GET" action="/blog/search" className="mt-4 flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Başlık, excerpt, tag veya keyword..."
            className="flex-1 rounded-lg border border-white/10 bg-ena-card/20 px-4 py-2.5 text-sm text-ena-text placeholder:text-ena-light/40"
          />
          <button
            type="submit"
            className="rounded-lg bg-ena-accent px-4 py-2.5 text-sm font-medium text-white"
          >
            Ara
          </button>
        </form>
      </header>

      {query ? (
        <p className="mb-6 text-sm text-ena-light/60">
          &quot;{query}&quot; için {result.total} sonuç
        </p>
      ) : (
        <p className="mb-6 text-sm text-ena-light/60">Arama yapmak için bir terim girin.</p>
      )}

      {result.items.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
          <BlogPagination
            current={result.page}
            totalPages={result.totalPages}
            basePath="/blog/search"
            searchParams={query ? { q: query } : {}}
          />
        </>
      ) : query ? (
        <p className="text-ena-light/60">Sonuç bulunamadı.</p>
      ) : null}

      <p className="mt-8">
        <Link href="/blog" className="text-sm text-ena-accent hover:underline">
          ← Blog dizinine dön
        </Link>
      </p>
    </div>
  );
}
