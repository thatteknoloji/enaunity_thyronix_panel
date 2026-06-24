import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listBlogsByProvince, getGeoLandingFaq } from "@/lib/blog-engine/blog-directory-service";
import { buildGeoLandingMetadata, buildBreadcrumbSchema } from "@/lib/blog-engine/blog-seo";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { BlogBreadcrumb } from "@/components/blog/BlogBreadcrumb";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ province: string }>;
}): Promise<Metadata> {
  const { province: slug } = await params;
  const result = await listBlogsByProvince(slug, 1, 1);
  if (!result.province) return { title: "Şehir bulunamadı" };
  return buildGeoLandingMetadata(result.province, result.total);
}

export default async function BlogGeoPage({
  params,
  searchParams,
}: {
  params: Promise<{ province: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { province: slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const result = await listBlogsByProvince(slug, page, 12);

  if (!result.province) notFound();

  const faq = await getGeoLandingFaq(result.province);

  const breadcrumbs = [
    { name: "Ana Sayfa", href: "/" },
    { name: "Blog", href: "/blog" },
    { name: result.province },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <BlogBreadcrumb items={breadcrumbs} schema={buildBreadcrumbSchema(breadcrumbs)} />
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ena-text">{result.province} Blog</h1>
        <p className="mt-2 text-ena-light/70">
          {result.province} için {result.total} lokasyon odaklı blog yazısı. Yerel SEO ve GEO
          rehberleri.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {result.items.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
          <BlogPagination
            current={result.page}
            totalPages={result.totalPages}
            basePath={`/blog/geo/${slug}`}
          />
        </div>

        <aside>
          <section className="rounded-xl border border-white/10 bg-ena-card/20 p-5">
            <h2 className="text-lg font-semibold text-ena-text mb-4">Sık Sorulan Sorular</h2>
            <div className="space-y-3">
              {faq.map((item) => (
                <details key={item.question} className="text-sm">
                  <summary className="cursor-pointer font-medium text-ena-text">{item.question}</summary>
                  <p className="mt-1 text-ena-light/70">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
