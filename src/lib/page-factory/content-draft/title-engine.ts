import type { BlueprintKind } from "@/lib/aeo/aeo-types";
import { clampLength, sanitizeText } from "@/lib/aeo/aeo-utils";
import type { DraftContext } from "./draft-types";
import { geoLabel, productName } from "./draft-utils";

export type TitleResult = {
  title: string;
  h1: string;
  metaTitle: string;
};

export function generateTitles(ctx: DraftContext): TitleResult {
  const name = productName(ctx);
  const geo = geoLabel(ctx);
  const cat = (ctx.metadata.categoryPath as string)?.split(/[>/|]/).pop()?.trim();

  let h1: string;
  let metaTitle: string;
  const title = name;

  switch (ctx.blueprintKind) {
    case "PRODUCT_FAQ":
      h1 = `${name} Hakkında Sık Sorulan Sorular`;
      metaTitle = `${name} | SSS ve Cevaplar`;
      break;
    case "PRODUCT_GEO":
      h1 = geo ? `${geo} ${name} Seçenekleri` : `${name} Bölgesel Seçenekler`;
      metaTitle = geo ? `${geo} ${name} | Özellikler ve SSS` : `${name} | Bölgesel Rehber`;
      break;
    case "PRODUCT_INTENT":
      h1 = `${name} Alırken Nelere Dikkat Edilmeli?`;
      metaTitle = `${name} Satın Alma Rehberi | İpuçları`;
      break;
    case "PRODUCT_CATEGORY":
      h1 = cat ? `${cat} Modelleri ve Seçim Rehberi` : `${name} Kategori Rehberi`;
      metaTitle = cat ? `${cat} | Modeller, Özellikler ve SSS` : `${name} | Kategori Rehberi`;
      break;
    case "PRODUCT_DETAIL":
    default:
      h1 = `${name} Özellikleri ve Kullanım Alanları`;
      metaTitle = `${name} | Özellikler, Ölçüler ve SSS`;
      break;
  }

  return {
    title: sanitizeText(title),
    h1: sanitizeText(h1),
    metaTitle: clampLength(sanitizeText(metaTitle), 45, 70),
  };
}
