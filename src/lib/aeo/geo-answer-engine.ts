import type { AeoAnswerBlock, AeoGeoHints } from "./aeo-types";
import type { BlueprintKind } from "./aeo-types";
import type { AeoProductContext } from "./aeo-utils";
import { clampLength, makeId, sanitizeText } from "./aeo-utils";

type GeoInput = {
  country?: string | null;
  province?: string | null;
  district?: string | null;
  geoPath?: string | null;
};

function parseGeoPath(geoPath?: string | null): { province: string | null; district: string | null } {
  if (!geoPath?.trim()) return { province: null, district: null };
  const parts = geoPath.split(/[>]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { province: parts[0]!, district: parts[1]! };
  if (parts.length === 1) return { province: parts[0]!, district: null };
  return { province: null, district: null };
}

export function generateGeoHints(
  ctx: AeoProductContext,
  blueprintKind: BlueprintKind,
  metadata: Record<string, unknown>,
  projectCountry?: string | null
): AeoGeoHints {
  const geoPath = (metadata.geoPath as string) || null;
  const parsed = parseGeoPath(geoPath);
  const country = projectCountry === "TR" ? "Türkiye" : projectCountry || null;
  const province = parsed.province;
  const district = parsed.district;
  const hasLocation = !!(province || district);

  const productName = ctx.product.normalizedName;
  const localQueryVariants: string[] = [];
  const geoAnswerBlocks: AeoAnswerBlock[] = [];

  if (province) {
    localQueryVariants.push(`${productName} ${province} nereden alınır?`);
    localQueryVariants.push(`${productName} ${province} fiyatları nasıl değişir?`);
    localQueryVariants.push(`${productName} ${province} için hangi seçenekler uygundur?`);
  }
  if (district && province) {
    localQueryVariants.push(`${productName} ${district} ${province} seçenekleri`);
  }

  if (blueprintKind === "PRODUCT_GEO" && hasLocation) {
    const locLabel = district ? `${district}, ${province}` : province!;
    const answer = clampLength(
      `${productName}, ${locLabel} bölgesindeki alıcılar için ${ctx.product.categoryPath ? categoryShort(ctx.product.categoryPath) : "ürün"} kategorisinde değerlendirilebilecek bir seçenektir. ` +
        `Bölgesel tercihler ve teslimat koşulları satın alma sürecinde dikkate alınabilir.`,
      180,
      400
    );
    geoAnswerBlocks.push({
      id: makeId("geo", 0),
      type: "GEO_ANSWER",
      title: `${productName} — ${locLabel}`,
      question: `${productName} ${locLabel} için uygun mu?`,
      answer,
      shortAnswer: answer.slice(0, 160),
      entities: [productName, locLabel].filter(Boolean),
      intents: ["local", "geo"],
      confidenceScore: hasLocation ? 0.75 : 0.4,
      sourceHints: [],
      schemaType: "Place",
      metadata: { province, district, country },
    });
  }

  let locationIntent: string | null = null;
  if (hasLocation) {
    locationIntent = district
      ? `${district} (${province}) odaklı yerel arama`
      : `${province} odaklı yerel arama`;
  } else if (country === "Türkiye") {
    locationIntent = "Türkiye geneli ürün araması";
  }

  return {
    country,
    province,
    district,
    locationIntent,
    localQueryVariants: localQueryVariants.slice(0, 6),
    geoAnswerBlocks,
  };
}

function categoryShort(categoryPath: string): string {
  return categoryPath.split(/[>/|]/).pop()?.trim() || categoryPath;
}
