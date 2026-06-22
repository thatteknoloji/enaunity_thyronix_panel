import type { ContentDraftSection, ContentDraftSectionType } from "./draft-types";
import type { DraftContext } from "./draft-types";
import { clampLength, makeId, sanitizeText } from "@/lib/aeo/aeo-utils";
import { featureBullets, geoLabel, productName, safeIntroSuffix } from "./draft-utils";
import { pickEntity } from "@/lib/aeo/aeo-utils";

const KIND_SECTIONS: Record<string, ContentDraftSectionType[]> = {
  PRODUCT_DETAIL: ["HERO", "QUICK_ANSWER", "PRODUCT_SUMMARY", "FEATURE_GRID", "USE_CASES", "BUYING_GUIDE", "FAQ", "CTA"],
  PRODUCT_FAQ: ["HERO", "QUICK_ANSWER", "FAQ", "CTA"],
  PRODUCT_GEO: ["HERO", "QUICK_ANSWER", "GEO_CONTEXT", "PRODUCT_SUMMARY", "FAQ", "CTA"],
  PRODUCT_INTENT: ["HERO", "QUICK_ANSWER", "BUYING_GUIDE", "COMPARISON", "FAQ", "CTA"],
  PRODUCT_CATEGORY: ["HERO", "INTRO", "FEATURE_GRID", "PRODUCT_SUMMARY", "FAQ", "CTA"],
};

function buildSection(type: ContentDraftSectionType, ctx: DraftContext, index: number): ContentDraftSection {
  const name = productName(ctx);
  const bullets = featureBullets(ctx);
  const usage = ctx.product ? pickEntity(ctx.entities, "USAGE_AREA") : null;
  const geo = geoLabel(ctx);
  const quick = ctx.aeo?.answerBlocks.find((b) => b.type === "QUICK_ANSWER");
  const overview = ctx.aeo?.answerBlocks.find((b) => b.type === "AI_OVERVIEW");

  const base = {
    id: makeId("section", index),
    type,
    entities: bullets.map((b) => b.split(":").pop()?.trim() || "").filter(Boolean),
    sourceHints: [{ sourceType: "PRODUCT_DATA", field: "normalizedName" }],
    metadata: {},
  };

  switch (type) {
    case "HERO":
      return {
        ...base,
        heading: name,
        content: clampLength(`${name} için ürün verisine dayalı özet bilgiler.`, 60, 200),
        bullets: [],
      };
    case "QUICK_ANSWER":
      return {
        ...base,
        heading: "Hızlı Cevap",
        content: quick?.answer || clampLength(`${name} ilgili kategoride değerlendirilebilecek bir üründür.`, 100, 320),
        bullets: [],
      };
    case "INTRO":
      return {
        ...base,
        heading: "Giriş",
        content: overview?.answer?.slice(0, 300) || `${name} kategorisi hakkında genel bilgiler.`,
        bullets: [],
      };
    case "PRODUCT_SUMMARY":
      return {
        ...base,
        heading: "Ürün Özeti",
        content: ctx.product?.descriptionClean
          ? clampLength(sanitizeText(ctx.product.descriptionClean.slice(0, 400)), 80, 400)
          : `Ürün verisinde belirtilen özelliklere göre ${name} değerlendirilebilir.`,
        bullets: bullets.slice(0, 4),
      };
    case "FEATURE_GRID":
      return {
        ...base,
        heading: "Öne Çıkan Özellikler",
        content: bullets.length
          ? "Ürün verisinde kayıtlı temel özellikler:"
          : "Malzeme bilgisi bulunmuyorsa seçim yaparken ürün açıklaması ve görseller kontrol edilmelidir.",
        bullets: bullets.length ? bullets : ["Ürün açıklamasını inceleyin", "Görselleri kontrol edin"],
      };
    case "USE_CASES":
      return {
        ...base,
        heading: "Kullanım Alanları",
        content: usage
          ? `${name}, ${usage.toLowerCase()} gibi alanlarda kullanım için uygundur.`
          : `${name} ilgili kategorideki tipik kullanım senaryolarına göre değerlendirilebilir.`,
        bullets: usage ? [usage] : [],
      };
    case "BUYING_GUIDE":
      return {
        ...base,
        heading: "Satın Alma Rehberi",
        content: `${name} seçerken ölçü, malzeme ve kullanım alanı uyumunu kontrol edin. ${safeIntroSuffix()}`,
        bullets: ["Ölçü ve alan uyumunu kontrol edin", "Malzeme bilgisini doğrulayın", "Ürün görsellerini inceleyin"],
      };
    case "COMPARISON":
      return {
        ...base,
        heading: "Karşılaştırma Notları",
        content: `${name}, benzer modellerle karşılaştırıldığında ürün verisindeki özellikler dikkate alınmalıdır. Kesin üstünlük iddiası yerine ihtiyaca uygunluk önerilir.`,
        bullets: bullets.slice(0, 3),
      };
    case "GEO_CONTEXT":
      return {
        ...base,
        heading: geo ? `${geo} Bağlamı` : "Bölgesel Bağlam",
        content: geo
          ? `${geo} bölgesi için ${name} seçenekleri değerlendirilirken teslimat ve kullanım alanı not edilmelidir.`
          : "Bölgesel lokasyon verisi bulunmuyor; genel ürün bilgileri sunulmaktadır.",
        bullets: ctx.aeo?.geoHints.localQueryVariants.slice(0, 3) || [],
      };
    case "FAQ":
      return {
        ...base,
        heading: "Sık Sorulan Sorular",
        content: "En çok sorulan sorular ve kısa cevaplar aşağıda yer alır.",
        bullets: [],
      };
    case "CTA":
      return {
        ...base,
        heading: "Sonraki Adımlar",
        content: `${name} hakkında daha fazla bilgi için ürün detaylarını ve SSS bölümünü inceleyin. ${safeIntroSuffix()}`,
        bullets: [],
      };
    default:
      return { ...base, heading: "", content: "", bullets: [] };
  }
}

export function generateSections(ctx: DraftContext): ContentDraftSection[] {
  const types = KIND_SECTIONS[ctx.blueprintKind] || KIND_SECTIONS.PRODUCT_DETAIL;
  return types.map((type, i) => buildSection(type, ctx, i));
}
