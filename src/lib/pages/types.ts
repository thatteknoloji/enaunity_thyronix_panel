export const PAGE_TEMPLATES = ["default", "faq", "contact", "policy"] as const;

export type PageTemplate = (typeof PAGE_TEMPLATES)[number];

export const PAGE_TEMPLATE_LABELS: Record<PageTemplate, string> = {
  default: "Genel Metin",
  faq: "SSS (Soru-Cevap)",
  contact: "İletişim",
  policy: "Politika / Süreç",
};

export const PAGE_TEMPLATE_HINTS: Record<PageTemplate, string> = {
  default: "Başlık ve paragraflar — kargo bilgileri gibi düz metin sayfaları için.",
  faq: "Her soru için H3 başlık, altına cevap paragrafı yazın. Accordion olarak gösterilir.",
  contact: "Üst kısım metin; iletişim bilgileri footer ayarlarından, form otomatik eklenir.",
  policy: "Madde listeleri ve adımlar vurgulu gösterilir — iade politikası gibi.",
};

export function normalizePageTemplate(value?: string | null): PageTemplate {
  if (value && PAGE_TEMPLATES.includes(value as PageTemplate)) {
    return value as PageTemplate;
  }
  return "default";
}
