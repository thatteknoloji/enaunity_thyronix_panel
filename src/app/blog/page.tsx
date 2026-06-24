import Link from "next/link";
import { getBlogDirectoryData } from "@/lib/blog-engine/blog-directory-service";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogPagination } from "@/components/blog/BlogPagination";

export const metadata = {
  title: "Blog | ENA",
  description: "ENA Blog — SEO, GEO ve AEO odaklı özgün içerikler, rehberler ve lokasyon yazıları",
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const { recent, popular, categories, geoHubs } = await getBlogDirectoryData(page, 12);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ena-text">Blog</h1>
          <p className="mt-2 text-ena-light/70">Özgün rehberler, SSS ve lokasyon içerikleri</p>
        </div>
        <Link
          href="/blog/search"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-ena-light/70 hover:border-ena-accent/40"
        >
          Blog Ara
        </Link>
      </header>

      {popular.items.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-ena-text mb-4">Popüler Yazılar</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popular.items.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section>
            <h2 className="text-lg font-semibold text-ena-text mb-4">Son Yazılar</h2>
            {recent.items.length === 0 ? (
              <p className="text-ena-light/60">Henüz yayınlanmış blog yazısı yok.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {recent.items.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            )}
            <BlogPagination
              current={recent.page}
              totalPages={recent.totalPages}
              basePath="/blog"
            />
          </section>
        </div>

        <aside className="space-y-8">
          {categories.length > 0 ? (
            <section className="rounded-xl border border-white/10 bg-ena-card/20 p-5">
              <h2 className="text-sm font-semibold text-ena-text uppercase tracking-wide mb-3">
                Kategoriler
              </h2>
              <ul className="space-y-2">
                {categories.slice(0, 12).map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      href={`/blog/category/${cat.slug}`}
                      className="flex justify-between text-sm text-ena-light/70 hover:text-ena-accent"
                    >
                      <span>{cat.name}</span>
                      <span className="text-ena-light/40">{cat.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {geoHubs.length > 0 ? (
            <section className="rounded-xl border border-white/10 bg-ena-card/20 p-5">
              <h2 className="text-sm font-semibold text-ena-text uppercase tracking-wide mb-3">
                GEO İçerikleri
              </h2>
              <ul className="space-y-2">
                {geoHubs.map((geo) => (
                  <li key={geo.slug}>
                    <Link
                      href={`/blog/geo/${geo.slug}`}
                      className="flex justify-between text-sm text-ena-light/70 hover:text-ena-accent"
                    >
                      <span>{geo.name}</span>
                      <span className="text-ena-light/40">{geo.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
