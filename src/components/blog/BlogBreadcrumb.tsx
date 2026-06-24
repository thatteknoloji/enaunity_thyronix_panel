import Link from "next/link";
import type { BreadcrumbItem } from "@/lib/blog-engine/blog-seo";

type Props = {
  items: BreadcrumbItem[];
  schema?: Record<string, unknown>;
};

export function BlogBreadcrumb({ items, schema }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      {schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ) : null}
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ena-light/60">
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="hover:text-ena-accent transition">
                {item.name}
              </Link>
            ) : (
              <span className={i === items.length - 1 ? "text-ena-text font-medium" : ""}>
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
