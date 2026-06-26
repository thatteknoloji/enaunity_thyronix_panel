import { getMockupTemplate } from "@/lib/pod-core/mockup-template-registry";
import {
  getPodProductProfile,
  listPodProductProfiles,
} from "@/lib/pod-core/product-profiles/pod-product-profile-registry";
import type { PodProductProfile } from "@/lib/pod-core/product-profiles/pod-product-profile-types";
import { buildMarketplaceDefaults } from "./marketplace-bridge";
import {
  buildProductGraphFromPod,
  graphToLegacyFlags,
  mergeProductGraph,
} from "./product-graph-builder";
import { applyGraphOverrides, getProductGraphByCode } from "./product-graph";
import { listCustomProfileIds, loadProfileOverrides } from "./profile-store";
import type {
  CreateProductEngineInput,
  ProductEngineDto,
  ProductEngineFilters,
  ProductEngineOverrides,
  ProductGraphProfile,
} from "./types";

function buildFromGraph(graph: ProductGraphProfile, source: ProductEngineDto["source"]): ProductEngineDto {
  const template = getMockupTemplate(graph.pod.mockupTemplate);
  const flags = graphToLegacyFlags(graph);

  return {
    id: graph.identity.productCode,
    source,
    graph,
    identity: {
      name: graph.identity.displayName,
      productType: graph.identity.productType,
      category: graph.identity.category,
      subCategory: graph.identity.subcategory,
      brand: "ENA",
      sku: graph.identity.productCode,
      barcode: graph.pod.mockupTemplate,
    },
    production: {
      printArea: graph.pod.printArea,
      safeArea: graph.pod.safeArea,
      bleed: graph.pod.bleed,
      exportMode: graph.pod.exportMode,
      dpi: graph.pod.dpi,
      shape: "RECTANGLE",
      mockupType: graph.identity.productType,
      productionProfile: graph.production.productionProfile,
      productionNotes: "",
      packagingType: graph.production.packagingProfile,
      machineNotes: graph.production.machineType,
    },
    pricing: {
      pricingCatalog: graph.pricing.pricingCatalogId,
      pricingRule: graph.pricing.pricingRuleCode,
      marketplaceRule: graph.pricing.pricingRuleCode,
      dealerRule: "DEALER_TIER",
      retailRule: graph.pricing.pricingRuleCode,
    },
    mockup: {
      front: template?.image ?? "",
      back: "",
      detail: "",
      lifestyle: "",
      templates: [graph.pod.mockupTemplate],
    },
    media: {
      cover: template?.image ?? "",
      gallery: template?.image ? [template.image] : [],
      thumbnail: template?.image ?? "",
      seoImage: template?.image ?? "",
    },
    seo: {
      title: graph.seo.entity,
      description: `${graph.identity.displayName} — ENA ürün profili`,
      slug: graph.identity.slug,
      tags: [graph.identity.category, graph.identity.productType],
      keywords: graph.seo.keywords,
    },
    marketplace: buildMarketplaceDefaults(graph.identity.category),
    pod: {
      templateId: graph.pod.mockupTemplate,
      templateType: graph.identity.productType,
      variantId: graph.pod.mockupTemplate,
      printAreaMode: "RECTANGLE",
      editorPlugin: "standard",
      overlayVisible: true,
      exportCrop: "print",
      productionPackEnabled: true,
    },
    flags,
    updatedAt: new Date().toISOString(),
  };
}

function buildFromPodProfile(profile: PodProductProfile, overrides?: ProductEngineOverrides): ProductEngineDto {
  const graph = mergeProductGraph(
    buildProductGraphFromPod(profile),
    overrides?.graph
  );
  const base = buildFromGraph(graph, "pod_profile");
  if (!overrides) return base;
  return mergeDto(base, overrides);
}

function mergeDto(base: ProductEngineDto, overrides: ProductEngineOverrides): ProductEngineDto {
  const graph = mergeProductGraph(base.graph, overrides.graph);
  const merged = buildFromGraph(graph, base.source);
  return {
    ...merged,
    identity: { ...merged.identity, ...overrides.identity },
    production: { ...merged.production, ...overrides.production },
    pricing: { ...merged.pricing, ...overrides.pricing },
    mockup: {
      ...merged.mockup,
      ...overrides.mockup,
      templates: overrides.mockup?.templates ?? merged.mockup.templates,
    },
    media: {
      ...merged.media,
      ...overrides.media,
      gallery: overrides.media?.gallery ?? merged.media.gallery,
    },
    seo: {
      ...merged.seo,
      ...overrides.seo,
      tags: overrides.seo?.tags ?? merged.seo.tags,
      keywords: overrides.seo?.keywords ?? merged.seo.keywords,
    },
    marketplace: {
      trendyol: { ...merged.marketplace.trendyol, ...overrides.marketplace?.trendyol },
      hepsiburada: { ...merged.marketplace.hepsiburada, ...overrides.marketplace?.hepsiburada },
      n11: { ...merged.marketplace.n11, ...overrides.marketplace?.n11 },
      ciceksepeti: { ...merged.marketplace.ciceksepeti, ...overrides.marketplace?.ciceksepeti },
    },
    pod: { ...merged.pod, ...overrides.pod },
    flags: { ...merged.flags, ...overrides.flags },
    updatedAt: new Date().toISOString(),
  };
}

function buildCustomProfile(id: string, overrides: ProductEngineOverrides): ProductEngineDto {
  const seedGraph: ProductGraphProfile = {
    identity: {
      productCode: id,
      productType: overrides.identity?.productType ?? "mdf-rectangle",
      displayName: overrides.identity?.name ?? id,
      slug: id.toLowerCase(),
      category: overrides.identity?.category ?? "Özel",
      subcategory: "CUSTOM",
      isActive: true,
      isPOD: false,
      isDropship: false,
      isMarketplace: false,
      isProduction: true,
    },
    pricing: {
      pricingCatalogId: "",
      pricingRuleCode: overrides.pricing?.pricingRule ?? "CUSTOM",
      defaultVat: 20,
      defaultCurrency: "TRY",
      defaultCustomerType: "RETAIL",
    },
    pod: {
      mockupTemplate: overrides.pod?.templateId ?? "custom",
      printArea: "0×0",
      printAreaRect: null,
      bleed: "10px",
      safeArea: "12px margin",
      exportMode: "PRINT_AREA",
      dpi: 300,
    },
    production: {
      productionProfile: id,
      machineType: "GENERIC_PRINT",
      packagingProfile: "FLAT_PACK",
      defaultPriority: "NORMAL",
    },
    marketplace: {
      marketplacePreset: "genel",
      defaultCategory: "genel",
      commissionProfile: "genel_DEFAULT",
      shippingProfile: "standard_cargo",
    },
    seo: {
      entity: overrides.identity?.name ?? id,
      topic: "Özel",
      keywords: [id],
      schemaType: "Product",
    },
    asset: {
      assetProfile: id,
      originalImageType: "PNG",
      mockupProfile: "custom",
      excelProfile: `${id}_EXCEL`,
    },
    analysis: {
      analysisProfile: `${id}_ANALYSIS`,
      costProfile: "CUSTOM",
      profitProfile: "margin_genel",
    },
  };
  const graph = mergeProductGraph(seedGraph, overrides.graph);
  const base = buildFromGraph(graph, "custom");
  return mergeDto(base, overrides);
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
    const hay = [
      p.id,
      p.identity.name,
      p.graph.identity.productCode,
      p.identity.sku,
      p.identity.category,
    ]
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
  const graph = getProductGraphByCode(id);
  const stored = await loadProfileOverrides(id);
  if (graph) {
    const merged = applyGraphOverrides(graph, stored?.overrides?.graph);
    const profile = getPodProductProfile(id);
    if (profile) return buildFromPodProfile(profile, stored?.overrides);
    return buildFromGraph(merged, stored?.custom ? "custom" : "pod_profile");
  }
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
