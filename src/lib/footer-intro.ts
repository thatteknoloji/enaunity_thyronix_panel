const DEFAULT_FOOTER_INTRO =
  "E-ticarete girişin en kolay yolu. Dropshipping, XML Bayilik ve Stoksuz E-Ticaret ile binlerce ürüne tek merkezden ulaşın.";

export function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Footer'da gösterilecek kısa tanıtım — asla uzun HTML render edilmez */
export function resolveFooterIntro(settings: Record<string, string | undefined>): string {
  const intro = settings.about_intro?.trim();
  if (intro) return intro.slice(0, 280);

  const legacy = settings.about_text?.trim();
  if (legacy) {
    const plain = stripHtmlToPlainText(legacy);
    if (plain) return plain.slice(0, 280);
  }

  return DEFAULT_FOOTER_INTRO;
}

export { DEFAULT_FOOTER_INTRO };
