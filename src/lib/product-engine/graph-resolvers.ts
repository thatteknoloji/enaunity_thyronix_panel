import {
  getProductGraphByCode,
  getProductGraphByTemplateId,
  resolveProductGraph,
} from "./product-graph";
import type { ProductGraphLookup, ProductGraphProfile } from "./types";

export function resolvePricingFromGraph(lookup: ProductGraphLookup) {
  const graph = resolveProductGraph(lookup);
  if (!graph) return null;
  return {
    pricingCatalogId: graph.pricing.pricingCatalogId,
    pricingRuleCode: graph.pricing.pricingRuleCode,
    defaultVat: graph.pricing.defaultVat,
    defaultCurrency: graph.pricing.defaultCurrency,
    defaultCustomerType: graph.pricing.defaultCustomerType,
    productCode: graph.identity.productCode,
  };
}

export function resolvePodFromGraph(lookup: ProductGraphLookup) {
  const graph = resolveProductGraph(lookup);
  if (!graph) return null;
  return {
    mockupTemplate: graph.pod.mockupTemplate,
    printArea: graph.pod.printArea,
    printAreaRect: graph.pod.printAreaRect,
    bleed: graph.pod.bleed,
    safeArea: graph.pod.safeArea,
    exportMode: graph.pod.exportMode,
    dpi: graph.pod.dpi,
    productCode: graph.identity.productCode,
    displayName: graph.identity.displayName,
    templateType: graph.identity.productType,
  };
}

export function resolveProductionFromGraph(lookup: ProductGraphLookup) {
  const graph = resolveProductGraph(lookup);
  if (!graph) return null;
  return {
    productionProfile: graph.production.productionProfile,
    machineType: graph.production.machineType,
    packagingProfile: graph.production.packagingProfile,
    defaultPriority: graph.production.defaultPriority,
    displayName: graph.identity.displayName,
    productCode: graph.identity.productCode,
  };
}

export function resolveMarketplaceFromGraph(lookup: ProductGraphLookup) {
  const graph = resolveProductGraph(lookup);
  if (!graph) return null;
  return {
    marketplacePreset: graph.marketplace.marketplacePreset,
    defaultCategory: graph.marketplace.defaultCategory,
    commissionProfile: graph.marketplace.commissionProfile,
    shippingProfile: graph.marketplace.shippingProfile,
    displayName: graph.identity.displayName,
  };
}

export function resolveAnalysisFromGraph(lookup: ProductGraphLookup) {
  const graph = resolveProductGraph(lookup);
  if (!graph) return null;
  return {
    analysisProfile: graph.analysis.analysisProfile,
    costProfile: graph.analysis.costProfile,
    profitProfile: graph.analysis.profitProfile,
    pricingRuleCode: graph.pricing.pricingRuleCode,
    marketplacePreset: graph.marketplace.marketplacePreset,
  };
}

export function resolveAssetFromGraph(lookup: ProductGraphLookup) {
  const graph = resolveProductGraph(lookup);
  if (!graph) return null;
  return {
    assetProfile: graph.asset.assetProfile,
    originalImageType: graph.asset.originalImageType,
    mockupProfile: graph.asset.mockupProfile,
    excelProfile: graph.asset.excelProfile,
  };
}

export function isDropshipProduct(lookup: ProductGraphLookup): boolean {
  const graph = resolveProductGraph(lookup);
  return graph?.identity.isDropship ?? false;
}

export function enrichTemplateIdFromGraph(templateId: string): {
  pricingRuleCode: string;
  pricingCatalogId?: string;
  variantId?: string;
  displayName: string;
} | null {
  const graph = getProductGraphByTemplateId(templateId);
  if (!graph) return null;
  return {
    pricingRuleCode: graph.pricing.pricingRuleCode,
    pricingCatalogId: graph.pricing.pricingCatalogId || undefined,
    displayName: graph.identity.displayName,
  };
}

export function enrichProductCodeFromGraph(productCode: string): ProductGraphProfile | null {
  return getProductGraphByCode(productCode) ?? null;
}
