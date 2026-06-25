import type { BrainInput, ResearchSummary, SmartOutline } from "./ai-brain-types";

export const AI_BRAIN_BANNED_PHRASES = [
  "seo, geo ve aeo perspektifinden",
  "içerik tamamen özgün üretilmiştir",
  "rakip metinlerden kopyalama yapılmaz",
  "bu rehberde konuyu ele alıyoruz",
  "daha fazla bilgi için bizimle iletişime geçin",
] as const;

export function buildResearchSummary(input: BrainInput): ResearchSummary {
  const topic = input.keyword || input.product || input.category || "içerik";
  return {
    targetAudience: input.product ? "Satın alma kararındaki ürün odaklı kullanıcılar" : "Bilgi arayan ve karar vermek isteyen kullanıcılar",
    coreNeed: `${topic} konusunda güvenilir, uygulanabilir ve karşılaştırmalı bilgi`,
    scope: [
      `${topic} temel tanım ve kapsam`,
      "seçim kriterleri",
      "maliyet / verim dengesi",
      "uygulama senaryoları",
      "sık hatalar ve çözümler",
    ],
    headingSuggestions: [
      `${topic} nedir?`,
      `${topic} seçerken nelere dikkat edilmeli?`,
      `${topic} maliyet ve kalite dengesi`,
      `${topic} için uygulama örnekleri`,
      `${topic} sık sorulan sorular`,
    ],
    questionsToAnswer: [
      "Kimler için uygundur?",
      "Ne zaman tercih edilmelidir?",
      "Hangi kriterler satın alma kararını belirler?",
      "Yerel ihtiyaçlar nasıl değişir?",
      "En sık yapılan hata nedir?",
    ],
  };
}

export function buildSmartOutline(input: BrainInput): SmartOutline {
  const h1 = input.keyword || input.product || input.category || "Akıllı İçerik Rehberi";
  return {
    h1,
    intro: `${h1} konusunda kısa ve net bir çerçeve sun.`,
    sections: [
      "Konuya hızlı giriş ve temel kavramlar",
      "Karar kriterleri ve değerlendirme modeli",
      "Karşılaştırmalı senaryolar ve örnekler",
      "Uygulama adımları ve kaçınılacak hatalar",
      "Sonuç, özet ve aksiyon planı",
    ],
    faqQuestions: ["Nedir?", "Kimler için uygundur?", "Nasıl başlanır?"],
    conclusion: "Kısa özet + net aksiyon",
    cta: "teklif iste",
    internalLinkSuggestions: {
      relatedBlogs: ["blog-karsilastirma", "blog-rehber"],
      relatedProducts: ["urun-1", "urun-2"],
      relatedPages: ["sayfa-rehber", "sayfa-cozum"],
      relatedCategories: ["kategori-genel", "kategori-alt"],
    },
    schemaSuggestion: ["Article", "FAQPage", "BreadcrumbList"],
  };
}
