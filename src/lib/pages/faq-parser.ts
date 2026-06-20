function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export type FaqItem = { question: string; answerHtml: string };

export function parseFaqContent(html: string): { introHtml: string; items: FaqItem[] } {
  const items: FaqItem[] = [];
  const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|$)/gi;
  let firstH3 = html.search(/<h3/i);
  const introHtml = firstH3 >= 0 ? html.slice(0, firstH3).trim() : html.trim();

  let match: RegExpExecArray | null;
  while ((match = h3Regex.exec(html)) !== null) {
    const answerHtml = match[2].trim();
    if (!stripTags(match[1]) && !answerHtml) continue;
    items.push({
      question: stripTags(match[1]),
      answerHtml,
    });
  }

  return { introHtml, items };
}
