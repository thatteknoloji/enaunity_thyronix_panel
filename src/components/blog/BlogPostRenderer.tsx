import type { BlogContentPayload, BlogFaqItem, BlogInternalLink } from "@/lib/blog-engine/blog-types";
import { sitePolicyProseClass } from "@/components/site/SitePageShell";

type Props = {
  title: string;
  excerpt?: string;
  content: BlogContentPayload;
  faq: BlogFaqItem[];
  internalLinks?: BlogInternalLink[];
  publishedAt?: string | null;
  schema?: Record<string, unknown>;
};

export function BlogPostRenderer({
  title,
  excerpt,
  content,
  faq,
  internalLinks = [],
  publishedAt,
  schema,
}: Props) {
  return (
    <article>
      {schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ) : null}
      <header className="mb-8 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ena-text md:text-4xl">
          {content.h1 || title}
        </h1>
        {excerpt ? <p className="mt-3 text-ena-light/80 text-lg">{excerpt}</p> : null}
        {publishedAt ? (
          <p className="mt-2 text-xs text-ena-light/60">
            {new Date(publishedAt).toLocaleDateString("tr-TR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        ) : null}
      </header>

      <div className={`space-y-8 ${sitePolicyProseClass}`}>
        {content.intro ? (
          <section>
            <p className="text-ena-light/90 leading-relaxed">{content.intro}</p>
          </section>
        ) : null}

        {content.sections.map((section) => (
          <section key={section.id}>
            <h2 className="text-xl font-semibold text-ena-text mb-3">{section.heading}</h2>
            <p className="text-ena-light/85 leading-relaxed">{section.body}</p>
          </section>
        ))}

        {content.conclusion ? (
          <section className="rounded-xl border border-white/10 bg-ena-card/30 p-5">
            <h2 className="text-lg font-semibold text-ena-text mb-2">Sonuç</h2>
            <p className="text-ena-light/85">{content.conclusion}</p>
          </section>
        ) : null}

        {faq.length > 0 ? (
          <section>
            <h2 className="text-xl font-semibold text-ena-text mb-4">Sık Sorulan Sorular</h2>
            <div className="space-y-4">
              {faq.map((item) => (
                <details
                  key={item.question}
                  className="rounded-lg border border-white/10 bg-ena-card/20 p-4"
                >
                  <summary className="cursor-pointer font-medium text-ena-text">{item.question}</summary>
                  <p className="mt-2 text-sm text-ena-light/80">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {internalLinks.length > 0 ? (
          <section>
            <h2 className="text-lg font-semibold text-ena-text mb-3">İlgili İçerikler</h2>
            <ul className="space-y-2">
              {internalLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-ena-accent hover:underline">
                    {link.title}
                  </a>
                  <span className="text-xs text-ena-light/50 ml-2">({link.reason})</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}
