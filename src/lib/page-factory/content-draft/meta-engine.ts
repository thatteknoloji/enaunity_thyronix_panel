import { clampLength, sanitizeText } from "@/lib/aeo/aeo-utils";
import type { DraftContext } from "./draft-types";
import { geoLabel, productName, safeIntroSuffix } from "./draft-utils";
import { pickEntity } from "@/lib/aeo/aeo-utils";

export function generateMetaDescription(ctx: DraftContext, h1: string): string {
  const name = productName(ctx);
  const usage = ctx.product ? pickEntity(ctx.entities, "USAGE_AREA") : null;
  const geo = geoLabel(ctx);
  const cat = (ctx.metadata.categoryPath as string)?.split(/[>/|]/).pop()?.trim();

  let desc: string;
  switch (ctx.blueprintKind) {
    case "PRODUCT_FAQ":
      desc = `${name} hakkında sık sorulan sorular, kullanım ipuçları ve satın alma notları. Ürün verisine dayalı kısa ve net cevaplar.`;
      break;
    case "PRODUCT_GEO":
      desc = geo
        ? `${geo} bölgesi için ${name} seçenekleri, kullanım alanları ve SSS. Bölgesel tercihler için rehber içerik.`
        : `${name} için bölgesel seçenekler, kullanım alanları ve SSS. Ürün verisine dayalı rehber.`;
      break;
    case "PRODUCT_INTENT":
      desc = `${name} seçerken dikkat edilmesi gerekenler, ölçü ve malzeme notları. Satın alma öncesi kontrol listesi.`;
      break;
    case "PRODUCT_CATEGORY":
      desc = cat
        ? `${cat} modelleri, özellik karşılaştırması ve seçim ipuçları. Kategori rehberi ve SSS.`
        : `${name} kategorisi için modeller, özellikler ve seçim rehberi.`;
      break;
    default:
      desc = usage
        ? `${name} özellikleri, ${usage.toLowerCase()} kullanım alanı ve SSS. Ürün verisine dayalı rehber içerik.`
        : `${name} özellikleri, kullanım alanları ve SSS. ${safeIntroSuffix()}`;
      break;
  }

  if (!desc.includes(h1.slice(0, 20)) && desc.length < 120) {
    desc = `${h1.slice(0, 40)}. ${desc}`;
  }

  return clampLength(sanitizeText(desc), 130, 160);
}

export function generateIntro(ctx: DraftContext): string {
  const name = productName(ctx);
  const quick = ctx.aeo?.answerBlocks.find((b) => b.type === "QUICK_ANSWER");
  if (quick?.answer) return clampLength(sanitizeText(quick.answer), 120, 400);

  const usage = ctx.product ? pickEntity(ctx.entities, "USAGE_AREA") : null;
  const intro = usage
    ? `${name}, ${usage.toLowerCase()} gibi alanlarda değerlendirilebilecek bir üründür. Ürün verisinde belirtilen özelliklere göre seçim yapılabilir.`
    : `${name} hakkında ürün verisine dayalı özet bilgiler bu sayfada yer alır. Eksik bilgi varsa ürün açıklaması ve görseller kontrol edilmelidir.`;

  return clampLength(sanitizeText(intro), 120, 400);
}
