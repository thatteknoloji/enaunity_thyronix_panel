import Link from "next/link";
import type { BlogCardData } from "@/lib/blog-engine/blog-directory-service";
import { categoryToSlug } from "@/lib/blog-engine/blog-directory-service";

type Props = {
  post: BlogCardData;
};

export function BlogCard({ post }: Props) {
  return (
    <article className="rounded-xl border border-white/10 bg-ena-card/20 p-5 hover:border-ena-accent/30 transition">
      <Link href={`/blog/${post.slug}`} className="block">
        <h2 className="text-lg font-semibold text-ena-text hover:text-ena-accent line-clamp-2">
          {post.title}
        </h2>
        {post.excerpt ? (
          <p className="mt-2 text-sm text-ena-light/70 line-clamp-3">{post.excerpt}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-ena-light/50">
          {post.category ? (
            <Link
              href={`/blog/category/${categoryToSlug(post.category)}`}
              className="text-ena-accent/80 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {post.category}
            </Link>
          ) : null}
          {post.province ? <span>{post.province}</span> : null}
          {post.publishedAt ? (
            <span>
              {post.publishedAt.toLocaleDateString("tr-TR", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
