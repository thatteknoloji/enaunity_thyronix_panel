import type { ProductEntity, ProductAttribute, ProductContentDNA, ProductImage, ProductUniverse } from "@prisma/client";

export type BlueprintSuggestion = {
  pageType: string;
  title: string;
  hierarchyLevel: number;
  clusterPath: string;
  metadata: Record<string, unknown>;
};

export type ProductBlueprintPlan = {
  productPage: BlueprintSuggestion;
  categoryPage: BlueprintSuggestion | null;
  intentPage: BlueprintSuggestion | null;
  geoFusion: BlueprintSuggestion | null;
  internalLinks: Array<{ label: string; suggestedSlug: string; relation: string }>;
};

export function planProductBlueprints(
  product: ProductUniverse & {
    entities?: ProductEntity[];
    attributes?: ProductAttribute[];
    contentDNA?: ProductContentDNA | null;
    images?: ProductImage[];
  },
  options?: { includeGeo?: boolean }
): ProductBlueprintPlan {
  const entities = product.entities || [];
  const dna = product.contentDNA;
  const theme = entities.find((e) => e.type === "THEME")?.value;
  const material = entities.find((e) => e.type === "MATERIAL")?.value;
  const size = entities.find((e) => e.type === "SIZE")?.value;
  const usage = entities.find((e) => e.type === "USAGE_AREA")?.value;

  const productPage: BlueprintSuggestion = {
    pageType: "PRODUCT",
    title: product.normalizedName,
    hierarchyLevel: 3,
    clusterPath: [product.categoryPath, material, theme].filter(Boolean).join(" > "),
    metadata: {
      generationSource: "PRODUCT_UNIVERSE_V1",
      contentStatus: "NOT_GENERATED",
      targetKeyword: dna?.targetKeyword || product.normalizedName.toLowerCase(),
      productId: product.id,
      slug: product.slug,
    },
  };

  const categoryPage: BlueprintSuggestion | null = product.categoryPath
    ? {
        pageType: "CATEGORY",
        title: product.categoryPath.split(/[>/|]/).pop()?.trim() || product.categoryPath,
        hierarchyLevel: 2,
        clusterPath: product.categoryPath,
        metadata: {
          generationSource: "PRODUCT_UNIVERSE_V1",
          contentStatus: "NOT_GENERATED",
          parentProductId: product.id,
        },
      }
    : null;

  const intentPage: BlueprintSuggestion | null = dna?.intent
    ? {
        pageType: "INTENT",
        title: `${dna.primaryEntity} — ${dna.intent}`,
        hierarchyLevel: 2,
        clusterPath: dna.intent,
        metadata: {
          generationSource: "PRODUCT_UNIVERSE_V1",
          contentStatus: "NOT_GENERATED",
          intent: dna.intent,
          audience: dna.audience,
        },
      }
    : null;

  const geoFusion: BlueprintSuggestion | null =
    options?.includeGeo && (usage || theme)
      ? {
          pageType: "GEO",
          title: `${usage || theme} ${material || "tablo"} — GEO fusion`,
          hierarchyLevel: 1,
          clusterPath: `GEO > ${usage || theme}`,
          metadata: {
            generationSource: "PRODUCT_UNIVERSE_V1",
            contentStatus: "NOT_GENERATED",
            fusionType: "product_geo",
            productId: product.id,
          },
        }
      : null;

  const linkHints: string[] = dna?.internalLinkHintsJson
    ? (JSON.parse(dna.internalLinkHintsJson) as string[])
    : [];

  const internalLinks = linkHints.map((label) => ({
    label,
    suggestedSlug: label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-ğüşıöç]/gi, ""),
    relation: "sibling",
  }));

  if (material) {
    internalLinks.push({
      label: `${material} tablo modelleri`,
      suggestedSlug: `${material}-tablo-modelleri`,
      relation: "category",
    });
  }
  if (size) {
    internalLinks.push({
      label: `${size} tablo`,
      suggestedSlug: `${size}-tablo`,
      relation: "filter",
    });
  }

  return { productPage, categoryPage, intentPage, geoFusion, internalLinks };
}
