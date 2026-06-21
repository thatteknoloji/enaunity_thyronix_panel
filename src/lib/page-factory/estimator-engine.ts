import type { PageEstimate, ProductionType } from "./types";
import { TURKEY_GEO_STATS } from "./geo-engine";
import { estimateClusterCount } from "./cluster-engine";

/**
 * Sayfa sayısı tahmini — içerik üretmez, yalnızca matematiksel projeksiyon.
 * TR + GEO: il × ilçe tabanı + mahalle/köy/semt katkıları + cluster çarpanı
 */
export function estimatePageCount(
  sector: string,
  country: string,
  productionType: ProductionType
): PageEstimate {
  const isTr = country.toUpperCase() === "TR";
  const includesGeo = productionType === "GEO" || productionType === "GEO_SEO" || productionType === "MIXED";
  const includesProduct = ["PRODUCT", "SERVICE", "MIXED", "GEO_SEO", "SEO"].includes(productionType);

  const breakdown: Record<string, number> = {};
  let total = 0;

  if (isTr && includesGeo) {
    breakdown.il = TURKEY_GEO_STATS.il;
    breakdown.ilce = TURKEY_GEO_STATS.ilce;
    breakdown.mahalle = TURKEY_GEO_STATS.mahalle;
    breakdown.koy = TURKEY_GEO_STATS.koy;
    breakdown.semt = TURKEY_GEO_STATS.semt;

    const geoBase = TURKEY_GEO_STATS.il * TURKEY_GEO_STATS.ilce;
    breakdown.geoCross = geoBase;
    total += geoBase;

    const mahalleFactor = Math.round(TURKEY_GEO_STATS.mahalle * 0.0087);
    breakdown.mahalleWeighted = mahalleFactor;
    total += mahalleFactor;
  } else if (includesGeo) {
    breakdown.geoNodes = 100;
    total += 100;
  }

  if (includesProduct) {
    const clusters = estimateClusterCount(sector, country);
    breakdown.clusterPaths = clusters;
    total += clusters;
  }

  if (productionType === "FAQ") breakdown.faqPages = 50;
  if (productionType === "BLOG") breakdown.blogPages = 120;
  if (productionType === "SEO") breakdown.seoLanding = 200;

  if (productionType === "FAQ") total += breakdown.faqPages || 0;
  if (productionType === "BLOG") total += breakdown.blogPages || 0;
  if (productionType === "SEO") total += breakdown.seoLanding || 0;

  if (productionType === "MIXED") {
    total = Math.round(total * 1.15);
    breakdown.mixedMultiplier = 1.15;
  }

  total = Math.max(Math.round(total), 1);

  const formula = isTr && includesGeo
    ? `(il × ilçe) + (mahalle × 0.0087) + clusterPaths`
    : `topologyNodes + clusterPaths + typeModifiers`;

  return {
    totalPages: total,
    breakdown,
    formula,
    note: "Faz 1: yalnızca tahmin. Gerçek sayfa üretimi yapılmaz. Resmi coğrafi veri kaynağı bağlandığında formül güncellenecek.",
  };
}
