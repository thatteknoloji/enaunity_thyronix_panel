import { POD_PRICE_CATALOGS } from "@/lib/pricing-engine/pod-price-catalog";
import type { PodProductProfile } from "@/lib/pod-core/product-profiles/pod-product-profile-types";
import { POD_CORE_DEFAULTS } from "@/lib/pod-core/pod-types";
import type { ProductGraphOverrides, ProductGraphProfile } from "./types";

/** Print areas mirrored from mockup-template-registry (avoid circular import) */
const PRINT_AREAS: Record<string, { x: number; y: number; width: number; height: number }> = {
  "cam-tablo-front": { x: 60, y: 50, width: 280, height: 200 },
  "cam-yuvarlak-front": { x: 80, y: 60, width: 240, height: 240 },
  "mdf-tablo-front": { x: 50, y: 45, width: 300, height: 210 },
  "mdf-puzzle-front": { x: 40, y: 40, width: 320, height: 320 },
  "perde-front": { x: 30, y: 20, width: 340, height: 360 },
  "hali-front": { x: 40, y: 40, width: 320, height: 220 },
  "kilim-front": { x: 50, y: 50, width: 300, height: 200 },
  "kirlent-front": { x: 120, y: 120, width: 160, height: 160 },
  "nevresim-set": { x: 40, y: 40, width: 320, height: 240 },
  "poster-portrait": { x: 35, y: 35, width: 230, height: 330 },
  "mug-front": { x: 90, y: 80, width: 220, height: 140 },
};

/** Single source for category → marketplace slug mapping */
export const PRODUCT_GRAPH_CATEGORY_SLUGS: Record<string, string> = {
  "Cam Tablo": "cam-tablo",
  "Yuvarlak Cam": "cam-tablo",
  "MDF Tablo": "mdf-tablo",
  "MDF Puzzle": "mdf-tablo",
  Halı: "dekor",
  Kilim: "dekor",
  Perde: "dekor",
  Kırlent: "dekor",
  Nevresim: "dekor",
  Poster: "dekor",
  Kupa: "genel",
};

const DROPSHIP_CATEGORIES = new Set(["Halı", "Kilim"]);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function catalogForRule(ruleCode: string) {
  return POD_PRICE_CATALOGS.find((c) => c.ruleCode === ruleCode);
}

function machineTypeFor(profile: PodProductProfile): string {
  if (profile.mockupType.startsWith("GLASS")) return "UV_FLATBED";
  if (profile.mockupType.startsWith("MDF") || profile.mockupType === "PUZZLE_GRID") return "CNC_MDF";
  if (profile.mockupType === "CARPET_ROOM" || profile.mockupType === "RUG_ROOM") return "TEXTILE_DYE";
  if (profile.mockupType === "CURTAIN_WINDOW") return "TEXTILE_PRINT";
  if (profile.mockupType === "MUG_WRAP") return "SUBLIMATION";
  return "GENERIC_PRINT";
}

function packagingProfileFor(profile: PodProductProfile): string {
  return profile.formulaHint === "PIECE" ? "PIECE_BOX" : "FLAT_PACK";
}

export function marketplaceSlugForCategory(category: string): string {
  return PRODUCT_GRAPH_CATEGORY_SLUGS[category] ?? "genel";
}

export function buildProductGraphFromPod(profile: PodProductProfile): ProductGraphProfile {
  const catalog = catalogForRule(profile.pricingRuleCode);
  const printArea = PRINT_AREAS[profile.templateId] ?? null;
  const bleedPx = profile.mockupType === "PILLOW" ? 5 : profile.mockupType === "PUZZLE_GRID" ? 6 : 10;
  const safePx = profile.mockupType === "PILLOW" ? 8 : 12;
  const printLabel = printArea
    ? `${printArea.width}×${printArea.height}px @ (${printArea.x},${printArea.y})`
    : `${profile.defaultSize.widthCm}×${profile.defaultSize.heightCm} cm`;
  const categorySlug = marketplaceSlugForCategory(profile.category);
  const isDropship = DROPSHIP_CATEGORIES.has(profile.category);

  return {
    identity: {
      productCode: profile.id,
      productType: profile.templateType,
      displayName: profile.name,
      slug: slugify(profile.name),
      category: profile.category,
      subcategory: profile.materialCode,
      isActive: profile.status === "active",
      isPOD: true,
      isDropship,
      isMarketplace: true,
      isProduction: true,
    },
    pricing: {
      pricingCatalogId: profile.catalogId ?? catalog?.id ?? "",
      pricingRuleCode: profile.pricingRuleCode,
      defaultVat: 20,
      defaultCurrency: "TRY",
      defaultCustomerType: "RETAIL",
    },
    pod: {
      mockupTemplate: profile.templateId,
      printArea: printLabel,
      printAreaRect: printArea,
      bleed: `${bleedPx}px`,
      safeArea: `${safePx}px margin`,
      exportMode: profile.exportMode,
      dpi: POD_CORE_DEFAULTS.defaultDpi,
    },
    production: {
      productionProfile: profile.id,
      machineType: machineTypeFor(profile),
      packagingProfile: packagingProfileFor(profile),
      defaultPriority: "NORMAL",
    },
    marketplace: {
      marketplacePreset: categorySlug,
      defaultCategory: categorySlug,
      commissionProfile: `${categorySlug}_DEFAULT`,
      shippingProfile: "standard_cargo",
    },
    seo: {
      entity: profile.name,
      topic: profile.category,
      keywords: [profile.name, profile.category, "POD", "baskı"],
      schemaType: "Product",
    },
    asset: {
      assetProfile: profile.id,
      originalImageType: "PNG",
      mockupProfile: profile.templateId,
      excelProfile: `${profile.id}_EXCEL`,
    },
    analysis: {
      analysisProfile: `${profile.id}_ANALYSIS`,
      costProfile: profile.pricingRuleCode,
      profitProfile: `margin_${categorySlug}`,
    },
  };
}

export function mergeProductGraph(
  base: ProductGraphProfile,
  overrides?: ProductGraphOverrides
): ProductGraphProfile {
  if (!overrides) return base;
  return {
    identity: { ...base.identity, ...overrides.identity },
    pricing: { ...base.pricing, ...overrides.pricing },
    pod: { ...base.pod, ...overrides.pod },
    production: { ...base.production, ...overrides.production },
    marketplace: { ...base.marketplace, ...overrides.marketplace },
    seo: {
      ...base.seo,
      ...overrides.seo,
      keywords: overrides.seo?.keywords ?? base.seo.keywords,
    },
    asset: { ...base.asset, ...overrides.asset },
    analysis: { ...base.analysis, ...overrides.analysis },
  };
}

export function graphToLegacyFlags(graph: ProductGraphProfile) {
  return {
    active: graph.identity.isActive,
    pod: graph.identity.isPOD,
    dropship: graph.identity.isDropship,
    production: graph.identity.isProduction,
  };
}
