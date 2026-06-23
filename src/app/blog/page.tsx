import Link from "next/link";
import { listBlogPosts } from "@/lib/blog-engine/blog-service";

export const metadata = {
  title: "Blog",
  description: "ENA Blog — SEO, GEO ve AEO odaklı özgün içerikler",
};

export default async function BlogIndexPage() {
  const { items } = await listBlogPosts({ status: "PUBLISHED", limit: 50 });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ena-text">Blog</h1>
        <p className="mt-2 text-ena-light/70">Özgün rehberler, SSS ve lokasyon içerikleri</p>
      </header>
      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="text-ena-light/60">Henüz yayınlanmış blog yazısı yok.</p>
        ) : (
          items.map((post) => (
            <article
              key={post.id}
              className="rounded-xl border border-white/10 bg-ena-card/20 p-5 hover:border-ena-accent/30 transition"
            >
              <Link href={`/blog/${post.slug}`} className="block">
                <h2 className="text-xl font-semibold text-ena-text hover:text-ena-accent">
                  {post.title}
                </h2>
                {post.excerpt ? (
                  <p className="mt-2 text-sm text-ena-light/70 line-clamp-2">{post.excerpt}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-ena-light/50">
                  {post.province ? <span>{post.province}</span> : null}
                  {post.category ? <span>· {post.category}</span> : null}
                  {post.publishedAt ? (
                    <span>
                      · {new Date(post.publishedAt).toLocaleDateString("tr-TR")}
                    </span>
                  ) : null}
                </div>
              </Link>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
