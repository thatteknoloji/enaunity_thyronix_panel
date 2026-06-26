import { listCatalogFixedSizes } from "@/lib/pricing-engine/pod-price-catalog";
import { listProductGraphs } from "@/lib/product-engine/product-graph";
import { resolvePricingFromGraph } from "@/lib/product-engine/graph-resolvers";

export type PodUiRole = "admin" | "dealer";

export type PodProfileCard = {
  id: string;
  name: string;
  category: string;
  templateId: string;
  catalogId?: string;
  pricingRuleCode: string;
  formulaHint: string;
  mockupType: string;
  status: string;
  fixedSizeCount: number;
  studioHref: string;
};

export function buildPodProfileCards(role: PodUiRole): PodProfileCard[] {
  const studioBase =
    role === "admin" ? "/admin/pod-tasarim-studyo" : "/dealer/pod/designs?new=1";

  return listProductGraphs()
    .filter((g) => g.identity.isPOD && g.identity.isActive)
    .map((graph) => {
      const pricing = resolvePricingFromGraph({ productCode: graph.identity.productCode })!;
      return {
        id: graph.identity.productCode,
        name: graph.identity.displayName,
        category: graph.identity.category,
        templateId: graph.pod.mockupTemplate,
        catalogId: pricing.pricingCatalogId || undefined,
        pricingRuleCode: pricing.pricingRuleCode,
        formulaHint: graph.production.packagingProfile === "PIECE_BOX" ? "PIECE" : "AREA",
        mockupType: graph.identity.productType,
        status: graph.identity.isActive ? "active" : "beta",
        fixedSizeCount: pricing.pricingCatalogId
          ? listCatalogFixedSizes(pricing.pricingCatalogId).length
          : 0,
        studioHref: `${studioBase}${studioBase.includes("?") ? "&" : "?"}template=${graph.pod.mockupTemplate}`,
      };
    });
}

export function podBasePath(role: PodUiRole): string {
  return role === "admin" ? "/admin/pod" : "/dealer/pod";
}
