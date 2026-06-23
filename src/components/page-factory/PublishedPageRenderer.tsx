type Section = {
  type?: string;
  heading?: string;
  content?: string;
  bullets?: string[];
};

type FaqItem = { question?: string; answer?: string };

type PageData = {
  title: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  robots: string;
  bodyJson: string;
  faqJson: string;
  schemaJson: string;
  internalLinksJson: string;
  metadataJson: string;
  publishScore: number;
  path: string;
};

export function PublishedPageRenderer({ page }: { page: PageData }) {
  let sections: Section[] = [];
  let faq: FaqItem[] = [];
  let schema: Record<string, unknown> = {};
  let internalLinks: Array<{ anchor?: string; targetSlug?: string | null }> = [];
  let intro = "";
  try { sections = JSON.parse(page.bodyJson || "[]"); } catch { /* */ }
  try { faq = JSON.parse(page.faqJson || "[]"); } catch { /* */ }
  try { schema = JSON.parse(page.schemaJson || "{}"); } catch { /* */ }
  try { internalLinks = JSON.parse(page.internalLinksJson || "[]"); } catch { /* */ }
  try {
    const meta = JSON.parse(page.metadataJson || "{}") as { intro?: string };
    intro = meta.intro || "";
  } catch { /* */ }

  const noindex = page.robots.includes("noindex");

  return (
    <>
      {noindex && <meta name="robots" content="noindex,follow" />}
      {Object.keys(schema).length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
      <article className="max-w-3xl mx-auto px-4 py-10">
        <header className="mb-8 border-b border-gray-100 pb-6">
          <p className="text-[10px] uppercase tracking-wider text-violet-600 mb-2">Page Factory — İç Önizleme</p>
          <h1 className="text-3xl font-bold text-gray-900">{page.h1 || page.title}</h1>
          {intro && <p className="mt-4 text-gray-600 leading-relaxed">{intro}</p>}
        </header>

        {sections.map((section, i) => (
          <section key={i} className="mb-8">
            {section.heading && (
              <h2 className="text-xl font-semibold text-gray-800 mb-3">{section.heading}</h2>
            )}
            {section.content && (
              <p className="text-gray-600 leading-relaxed mb-3">{section.content}</p>
            )}
            {section.bullets && section.bullets.length > 0 && (
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                {section.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {faq.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Sık Sorulan Sorular</h2>
            <div className="space-y-4">
              {faq.map((item, i) => (
                <div key={i} className="rounded-lg border border-gray-100 p-4">
                  <h3 className="font-medium text-gray-900">{item.question}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {internalLinks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">İlgili Bağlantılar</h2>
            <ul className="flex flex-wrap gap-2">
              {internalLinks.map((link, i) => (
                <li key={i}>
                  <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                    {link.anchor}
                    {link.targetSlug ? ` → ${link.targetSlug}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-10 pt-6 border-t border-gray-100 text-xs text-gray-400">
          <p>Path: {page.path} · Score: {page.publishScore} · {page.robots}</p>
        </footer>
      </article>
    </>
  );
}
