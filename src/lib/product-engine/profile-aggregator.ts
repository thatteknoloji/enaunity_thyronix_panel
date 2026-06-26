import { POD_PRICE_CATALOGS } from "@/lib/pricing-engine/pod-price-catalog";
import { getMockupTemplate } from "@/lib/pod-core/mockup-template-registry";
import {
  getPodProductProfile,
  listPodProductProfiles,
} from "@/lib/pod-core/product-profiles/pod-product-profile-registry";
import type { PodProductProfile } from "@/lib/pod-core/product-profiles/pod-product-profile-types";
import { POD_CORE_DEFAULTS } from "@/lib/pod-core/pod-types";
import { buildMarketplaceDefaults } from "./marketplace-bridge";
import { listCustomProfileIds, loadProfileOverrides } from "./profile-store";
import type {
  CreateProductEngineInput,
  ProductEngineDto,
  ProductEngineFilters,
  ProductEngineOverrides,
} from "./types";

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

function buildFromPodProfile(profile: PodProductProfile, overrides?: ProductEngineOverrides): ProductEngineDto {
  const template = getMockupTemplate(profile.templateId);
  const catalog = catalogForRule(profile.pricingRuleCode);
  const printArea = template?.printArea;
  const printLabel = printArea
    ? `${printArea.width}×${printArea.height}px @ (${printArea.x},${printArea.y})`
    : `${profile.defaultSize.widthCm}×${profile.defaultSize.heightCm} cm`;

  const base: ProductEngineDto = {
    id: profile.id,
    source: "pod_profile",
    identity: {
      name: profile.name,
      productType: profile.templateType,
      category: profile.category,
      subCategory: profile.materialCode,
      brand: "ENA",
      sku: profile.id,
      barcode: profile.variantId,
    },
    production: {
      printArea: printLabel,
      safeArea: template?.safeArea ? `${template.safeArea}px margin` : "12px margin",
      bleed: template?.bleed ? `${template.bleed}px` : `${POD_CORE_DEFAULTS.defaultBleedPx}px`,
      exportMode: profile.exportMode,
      dpi: POD_CORE_DEFAULTS.defaultDpi,
      shape: profile.shape,
      mockupType: profile.mockupType,
      productionProfile: profile.id,
      productionNotes: profile.warnings?.join(" ") ?? "",
      packagingType: profile.formulaHint === "PIECE" ? "PIECE" : "FLAT",
      machineNotes: "",
    },
    pricing: {
      pricingCatalog: profile.catalogId ?? catalog?.id ?? "",
      pricingRule: profile.pricingRuleCode,
      marketplaceRule: profile.pricingRuleCode,
      dealerRule: "DEALER_TIER",
      retailRule: profile.pricingRuleCode,
    },
    mockup: {
      front: template?.image ?? "",
      back: "",
      detail: "",
      lifestyle: "",
      templates: [profile.templateId],
    },
    media: {
      cover: template?.image ?? "",
      gallery: template?.image ? [template.image] : [],
      thumbnail: template?.image ?? "",
      seoImage: template?.image ?? "",
    },
    seo: {
      title: profile.name,
      description: `${profile.name} — ENA POD üretim profili`,
      slug: slugify(profile.name),
      tags: [profile.category, profile.templateType],
      keywords: [profile.name, profile.category, "POD", "baskı"],
    },
    marketplace: buildMarketplaceDefaults(profile.category),
    pod: {
      templateId: profile.templateId,
      templateType: profile.templateType,
      variantId: profile.variantId,
      printAreaMode: profile.printAreaMode,
      editorPlugin: profile.editorPlugin,
      overlayVisible: true,
      exportCrop: "print",
      productionPackEnabled: true,
    },
    flags: {
      active: profile.status === "active",
      pod: true,
      dropship: profile.category === "Halı" || profile.category === "Kilim",
      production: true,
    },
    updatedAt: new Date().toISOString(),
  };

  if (!overrides) return base;
  return mergeDto(base, overrides);
}

function mergeDto(base: ProductEngineDto, overrides: ProductEngineOverrides): ProductEngineDto {
  return {
    ...base,
    identity: { ...base.identity, ...overrides.identity },
    production: { ...base.production, ...overrides.production },
    pricing: { ...base.pricing, ...overrides.pricing },
    mockup: {
      ...base.mockup,
      ...overrides.mockup,
      templates: overrides.mockup?.templates ?? base.mockup.templates,
    },
    media: {
      ...base.media,
      ...overrides.media,
      gallery: overrides.media?.gallery ?? base.media.gallery,
    },
    seo: {
      ...base.seo,
      ...overrides.seo,
      tags: overrides.seo?.tags ?? base.seo.tags,
      keywords: overrides.seo?.keywords ?? base.seo.keywords,
    },
    marketplace: {
      trendyol: { ...base.marketplace.trendyol, ...overrides.marketplace?.trendyol },
      hepsiburada: { ...base.marketplace.hepsiburada, ...overrides.marketplace?.hepsiburada },
      n11: { ...base.marketplace.n11, ...overrides.marketplace?.n11 },
      ciceksepeti: { ...base.marketplace.ciceksepeti, ...overrides.marketplace?.ciceksepeti },
    },
    pod: { ...base.pod, ...overrides.pod },
    flags: { ...base.flags, ...overrides.flags },
    updatedAt: new Date().toISOString(),
  };
}

function buildCustomProfile(id: string, overrides: ProductEngineOverrides): ProductEngineDto {
  const base = buildFromPodProfile(
    {
      id,
      name: overrides.identity?.name ?? id,
      category: overrides.identity?.category ?? "Özel",
      templateType: overrides.identity?.productType ?? "mdf-rectangle",
      templateId: overrides.pod?.templateId ?? "custom",
      pricingRuleCode: overrides.pricing?.pricingRule ?? "CUSTOM",
      defaultSize: { widthCm: 0, heightCm: 0 },
      defaultQuantity: 1,
      shape: "RECTANGLE",
      allowedOrientations: ["landscape"],
      printAreaMode: "RECTANGLE",
      mockupType: "MDF_RECTANGLE",
      editorPlugin: "standard",
      exportMode: "PRINT_AREA",
      formulaHint: "AREA",
      materialCode: "CUSTOM",
      variantId: id,
      status: "active",
    },
    overrides
  );
  return { ...base, id, source: "custom" };
}

function matchesFilters(p: ProductEngineDto, filters: ProductEngineFilters): boolean {
  if (filters.category && p.identity.category !== filters.category) return false;
  if (filters.productType && p.identity.productType !== filters.productType) return false;
  if (filters.active === "1" && !p.flags.active) return false;
  if (filters.active === "0" && p.flags.active) return false;
  if (filters.pod === "1" && !p.flags.pod) return false;
  if (filters.dropship === "1" && !p.flags.dropship) return false;
  if (filters.production === "1" && !p.flags.production) return false;
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    const hay = [p.id, p.identity.name, p.identity.sku, p.identity.category, p.identity.brand]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export async function listProductEngineProfiles(
  filters: ProductEngineFilters = {}
): Promise<ProductEngineDto[]> {
  const profiles = listPodProductProfiles();
  const customIds = await listCustomProfileIds();
  const items: ProductEngineDto[] = [];

  for (const profile of profiles) {
    const stored = await loadProfileOverrides(profile.id);
    items.push(buildFromPodProfile(profile, stored?.overrides));
  }

  for (const id of customIds) {
    if (profiles.some((p) => p.id === id)) continue;
    const stored = await loadProfileOverrides(id);
    if (stored) items.push(buildCustomProfile(id, stored.overrides));
  }

  return items.filter((p) => matchesFilters(p, filters));
}

export async function getProductEngineProfile(id: string): Promise<ProductEngineDto | null> {
  const profile = getPodProductProfile(id);
  const stored = await loadProfileOverrides(id);
  if (profile) return buildFromPodProfile(profile, stored?.overrides);
  if (stored?.custom) return buildCustomProfile(id, stored.overrides);
  return null;
}

export async function createProductEngineProfile(
  input: CreateProductEngineInput
): Promise<ProductEngineDto> {
  const id =
    input.id?.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_") ||
    `CUSTOM_${Date.now().toString(36).toUpperCase()}`;

  if (getPodProductProfile(id)) {
    throw new Error("Bu kimlik rezerve POD profili ile çakışıyor");
  }

  const overrides: ProductEngineOverrides = {
    identity: input.identity,
    flags: input.flags ?? { active: true, pod: false, dropship: false, production: true },
    ...input.overrides,
  };

  await import("./profile-store").then((m) => m.saveProfileOverrides(id, overrides, true));
  return (await getProductEngineProfile(id))!;
}

export async function updateProductEngineProfile(
  id: string,
  overrides: ProductEngineOverrides
): Promise<ProductEngineDto> {
  const existing = await getProductEngineProfile(id);
  if (!existing) throw new Error("Ürün profili bulunamadı");

  const { saveProfileOverrides } = await import("./profile-store");
  const isCustom = existing.source === "custom";
  await saveProfileOverrides(id, overrides, isCustom);
  const updated = await getProductEngineProfile(id);
  if (!updated) throw new Error("Güncelleme başarısız");
  return updated;
}
