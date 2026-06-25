import type { BlogArticleOutput, PageContentOutput } from "@/lib/ai-writer/types";

function cleanupText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\b(kısaca|temelde|genel olarak)\b/gi, "")
    .trim();
}

export function runEditorialRevision<T extends BlogArticleOutput | PageContentOutput>(draft: T): T {
  if ("content" in draft) {
    return {
      ...draft,
      content: {
        ...draft.content,
        intro: cleanupText(draft.content.intro),
        sections: draft.content.sections.map((s) => ({ ...s, body: cleanupText(s.body) })),
      },
      seoDescription: cleanupText(draft.seoDescription),
    };
  }
  return {
    ...draft,
    intro: cleanupText(draft.intro),
    sections: draft.sections.map((s) => ({ ...s, body: cleanupText(s.body) })),
    seoDescription: cleanupText(draft.seoDescription),
    cta: draft.cta?.trim() || "Teklif iste",
  };
}
