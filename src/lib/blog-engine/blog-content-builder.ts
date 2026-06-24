import { slugify } from "@/lib/utils";
import {
  BLOG_ENGINE_VERSION,
  type BlogContentPayload,
  type BlogContentSection,
  type BlogFaqItem,
  type BlogSourceType,
  type ProductBlogType,
} from "./blog-types";

function section(
  type: BlogContentSection["type"],
  heading: string,
  body: string
): BlogContentSection {
  return { id: slugify(heading) || type, type, heading, body };
}

function paragraph(topic: string, angle: string): string {
  return `${topic} hakkında ${angle}. Bu rehberde konuyu SEO, GEO ve AEO perspektifinden özgün bir çerçevede ele alıyoruz. İçerik tamamen özgün üretilmiştir; rakip metinlerden kopyalama yapılmaz.`;
}

export function buildKeywordContent(keyword: string): BlogContentPayload {
  const h1 = `${keyword.charAt(0).toUpperCase()}${keyword.slice(1)} Rehberi`;
  const sections: BlogContentSection[] = [
    section("guide", `${keyword} Nedir?`, paragraph(keyword, "temel tanım ve kapsam")),
    section("guide", `${keyword} Nasıl Seçilir?`, paragraph(keyword, "doğru seçim kriterleri")),
    section("comparison", `${keyword} Karşılaştırması`, paragraph(keyword, "alternatiflerle karşılaştırma")),
    section("benefits", `${keyword} Avantajları`, paragraph(keyword, "sağladığı faydalar")),
    section("purchase", `${keyword} Satın Alma Rehberi`, paragraph(keyword, "satın alma süreci")),
    section("conclusion", "Sonuç", `${keyword} konusunda bilinçli karar vermek için yukarıdaki başlıkları sırayla incelemenizi öneririz.`),
  ];
  return {
    version: BLOG_ENGINE_VERSION,
    h1,
    intro: `${keyword} arayan kullanıcılar için hazırlanmış kapsamlı bir rehber. Aşağıda tanım, seçim, karşılaştırma ve sık sorulan soruları bulabilirsiniz.`,
    sections,
    conclusion: sections[sections.length - 1].body,
  };
}

export function buildProductContent(
  productName: string,
  category?: string,
  blogType: ProductBlogType = "usage"
): BlogContentPayload {
  const topic = productName;
  const cat = category || "ürün";

  const typeConfig: Record<
    ProductBlogType,
    { h1: string; intro: string; sections: BlogContentSection[] }
  > = {
    usage: {
      h1: `${topic} — Kullanım Rehberi`,
      intro: `${topic} ürününü doğru ve verimli kullanmak için adım adım rehber.`,
      sections: [
        section("usage", `${topic} Nasıl Kullanılır?`, paragraph(topic, "kullanım adımları ve ipuçları")),
        section("guide", `${topic} Kurulum ve Hazırlık`, paragraph(topic, "kurulum öncesi hazırlık")),
        section("guide", `${topic} Bakım ve Temizlik`, paragraph(topic, "bakım önerileri")),
        section("benefits", `${topic} Kullanım Avantajları`, paragraph(topic, "doğru kullanımın faydaları")),
        section("comparison", `${topic} Kullanım Senaryoları`, paragraph(topic, "farklı kullanım alanları")),
        section("conclusion", "Özet", `${topic} kullanım rehberini referans alarak en iyi sonucu alabilirsiniz.`),
      ],
    },
    benefits: {
      h1: `${topic} — Avantajlar ve Faydalar`,
      intro: `${topic} tercih edenler için sağladığı avantajları detaylıca inceliyoruz.`,
      sections: [
        section("benefits", `${topic} Temel Avantajları`, paragraph(topic, "tercih edilme nedenleri")),
        section("benefits", `${topic} Uzun Vadeli Faydalar`, paragraph(topic, "sürdürülebilir faydalar")),
        section("comparison", `${topic} Alternatiflere Göre Üstünlükler`, paragraph(topic, "rekabet avantajı")),
        section("guide", `${topic} ve ${cat} İlişkisi`, paragraph(topic, `${cat} kategorisindeki konumu`)),
        section("purchase", `Kimler ${topic} Tercih Etmeli?`, paragraph(topic, "hedef kitle")),
        section("conclusion", "Özet", `${topic} avantajları bilinçli karar vermenize yardımcı olur.`),
      ],
    },
    comparison: {
      h1: `${topic} — Karşılaştırma Rehberi`,
      intro: `${topic} ve alternatifleri arasında doğru seçimi yapmanız için karşılaştırma rehberi.`,
      sections: [
        section("comparison", `${topic} Alternatifleri`, paragraph(topic, "benzer ürünlerle kıyaslama")),
        section("comparison", `${topic} Fiyat-Performans`, paragraph(topic, "fiyat performans analizi")),
        section("guide", `${topic} Özellik Karşılaştırması`, paragraph(topic, "teknik özellik kıyası")),
        section("benefits", `${topic} Tercih Kriterleri`, paragraph(topic, "seçim kriterleri")),
        section("purchase", `${topic} Satın Alma Önerileri`, paragraph(topic, "satın alma ipuçları")),
        section("conclusion", "Özet", `${topic} karşılaştırma tablosu ile doğru tercihi yapın.`),
      ],
    },
    purchase: {
      h1: `${topic} — Satın Alma Rehberi`,
      intro: `${topic} satın alırken dikkat etmeniz gerekenler ve adım adım satın alma süreci.`,
      sections: [
        section("purchase", `${topic} Satın Alma Rehberi`, paragraph(topic, "satın alırken dikkat edilecekler")),
        section("guide", `${topic} Fiyatlandırma`, paragraph(topic, "fiyat aralıkları ve faktörler")),
        section("comparison", `${topic} Satıcı Karşılaştırması`, paragraph(topic, "güvenilir satıcı seçimi")),
        section("benefits", `${topic} Garanti ve İade`, paragraph(topic, "garanti koşulları")),
        section("usage", `${topic} Teslimat Sonrası`, paragraph(topic, "teslimat ve kurulum")),
        section("conclusion", "Özet", `${topic} satın alma sürecinde bu rehberi takip edin.`),
      ],
    },
    faq: {
      h1: `${topic} — Sık Sorulan Sorular`,
      intro: `${topic} hakkında en çok merak edilen sorular ve detaylı cevaplar.`,
      sections: [
        section("guide", `${topic} Nedir?`, paragraph(topic, "temel tanım")),
        section("guide", `${topic} Nasıl Seçilir?`, paragraph(topic, "seçim kriterleri")),
        section("benefits", `${topic} Avantajları`, paragraph(topic, "faydalar")),
        section("purchase", `${topic} Fiyatları`, paragraph(topic, "fiyat bilgisi")),
        section("usage", `${topic} Kullanımı`, paragraph(topic, "kullanım bilgisi")),
        section("conclusion", "Özet", `${topic} SSS bölümünde tüm sorularınıza yanıt bulabilirsiniz.`),
      ],
    },
  };

  const cfg = typeConfig[blogType];
  return {
    version: BLOG_ENGINE_VERSION,
    h1: cfg.h1,
    intro: cfg.intro,
    sections: cfg.sections,
    conclusion: cfg.sections[cfg.sections.length - 1].body,
  };
}

export function buildCategoryContent(category: string): BlogContentPayload {
  const sections: BlogContentSection[] = [
    section("guide", `${category} Nedir?`, paragraph(category, "kategori tanımı")),
    section("guide", `${category} Türleri`, paragraph(category, "alt kategori ve çeşitler")),
    section("benefits", `${category} Seçerken Nelere Dikkat Edilmeli?`, paragraph(category, "seçim kriterleri")),
    section("comparison", `Popüler ${category} Seçenekleri`, paragraph(category, "karşılaştırma")),
    section("purchase", `${category} Fiyat Rehberi`, paragraph(category, "fiyatlandırma mantığı")),
    section("conclusion", "Sonuç", `${category} kategorisinde doğru tercih için rehberimizi takip edin.`),
  ];
  return {
    version: BLOG_ENGINE_VERSION,
    h1: `${category} Kategorisi Rehberi`,
    intro: `${category} kategorisi hakkında kapsamlı bilgi, karşılaştırma ve satın alma ipuçları.`,
    sections,
    conclusion: sections[sections.length - 1].body,
  };
}

export function buildGeoContent(keyword: string, province: string, district?: string | null): BlogContentPayload {
  const loc = district ? `${province} ${district}` : province;
  const topic = `${loc} ${keyword}`;
  const sections: BlogContentSection[] = [
    section("guide", `${loc} Bölgesinde ${keyword}`, paragraph(topic, "yerel pazar özeti")),
    section("guide", `${loc} İçin ${keyword} Rehberi`, paragraph(topic, "bölgesel seçim önerileri")),
    section("benefits", `${loc} Avantajları`, paragraph(topic, "bölgesel fırsatlar")),
    section("purchase", `${loc} Satın Alma İpuçları`, paragraph(topic, "yerel satın alma")),
    section("comparison", `${loc} Alternatifleri`, paragraph(topic, "bölgesel karşılaştırma")),
    section("conclusion", "Sonuç", `${loc} için ${keyword} araştırmasında bu rehberi kullanabilirsiniz.`),
  ];
  return {
    version: BLOG_ENGINE_VERSION,
    h1: `${loc} ${keyword.charAt(0).toUpperCase()}${keyword.slice(1)} Rehberi`,
    intro: `${loc} bölgesinde ${keyword} arayanlar için yerel SEO ve GEO odaklı özgün içerik.`,
    sections,
    conclusion: sections[sections.length - 1].body,
  };
}

export type CompetitorStructure = {
  headings: string[];
  hasFaq: boolean;
};

export function extractCompetitorStructure(input: string): CompetitorStructure {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const headings: string[] = [];
  let hasFaq = false;
  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line)) {
      headings.push(line.replace(/^#{1,3}\s+/, "").trim());
    } else if (/^\d+[\.)]\s+/.test(line)) {
      headings.push(line.replace(/^\d+[\.)]\s+/, "").trim());
    } else if (line.endsWith("?") && line.length < 120) {
      headings.push(line);
      hasFaq = true;
    } else if (/^(sss|faq|sık sorulan)/i.test(line)) {
      hasFaq = true;
    }
  }
  if (headings.length < 3) {
    headings.push("Giriş", "Temel Bilgiler", "Detaylı İnceleme", "Karşılaştırma", "Sonuç");
  }
  return { headings: headings.slice(0, 8), hasFaq: hasFaq || headings.some((h) => h.endsWith("?")) };
}

export function buildCompetitorStructureContent(
  keyword: string,
  structure: CompetitorStructure
): BlogContentPayload {
  const sections = structure.headings.slice(0, 6).map((heading, i) =>
    section(
      i === 0 ? "intro" : i === structure.headings.length - 1 ? "conclusion" : "custom",
      heading,
      paragraph(keyword, `özgün içerik — ${heading.toLowerCase()} başlığı altında`)
    )
  );
  while (sections.length < 5) {
    sections.push(section("custom", `Ek Bilgi ${sections.length}`, paragraph(keyword, "ek detay")));
  }
  return {
    version: BLOG_ENGINE_VERSION,
    h1: `${keyword} — Özgün İçerik Rehberi`,
    intro: `Bu içerik rakip yapıdan yalnızca iskelet ilham alır; metin tamamen özgündür.`,
    sections,
    conclusion: `${keyword} konusunda bilinçli karar için yukarıdaki bölümleri inceleyin.`,
  };
}

export function buildFaqItems(topic: string, sourceType: BlogSourceType, count = 5): BlogFaqItem[] {
  const base: BlogFaqItem[] = [
    { question: `${topic} nedir?`, answer: `${topic}, kullanıcıların sık aradığı bir konudur. Bu rehber özgün bilgi sunar.` },
    { question: `${topic} nasıl seçilir?`, answer: `Seçim yaparken kalite, fiyat ve kullanım amacını birlikte değerlendirin.` },
    { question: `${topic} fiyatları ne kadar?`, answer: `Fiyatlar segment ve özelliklere göre değişir; güncel teklifleri karşılaştırın.` },
    { question: `${topic} kimler için uygundur?`, answer: `Hedef kitlenize ve kullanım senaryonuza göre uygunluğu değerlendirin.` },
    { question: `${topic} hakkında daha fazla bilgi nerede?`, answer: `İlgili kategori ve ürün sayfalarımıza iç linklerden ulaşabilirsiniz.` },
  ];
  if (sourceType === "GEO") {
    base.push({ question: `Bölgesel ${topic} seçenekleri var mı?`, answer: `Evet, lokasyon bazlı seçenekler ve yerel rehber içerikler mevcuttur.` });
  }
  return base.slice(0, count);
}

export function buildSchemaJson(opts: {
  title: string;
  description: string;
  slug: string;
  faq: BlogFaqItem[];
  publishedAt?: string | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: opts.title,
        description: opts.description,
        url: `/blog/${opts.slug}`,
        datePublished: opts.publishedAt || undefined,
        author: { "@type": "Organization", name: "ENA" },
      },
      {
        "@type": "FAQPage",
        mainEntity: opts.faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };
}

export function buildSeoTitle(title: string, keyword?: string): string {
  const base = title.slice(0, 55);
  if (keyword && !base.toLowerCase().includes(keyword.toLowerCase())) {
    return `${base} | ${keyword}`.slice(0, 60);
  }
  return base.slice(0, 60);
}

export function buildSeoDescription(intro: string, keyword?: string): string {
  const text = intro.slice(0, 140);
  if (keyword && !text.toLowerCase().includes(keyword.toLowerCase())) {
    return `${keyword}: ${text}`.slice(0, 160);
  }
  return text.slice(0, 160);
}
