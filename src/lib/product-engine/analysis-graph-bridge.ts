import { resolveAnalysisFromGraph, resolveMarketplaceFromGraph } from "@/lib/product-engine/graph-resolvers";
import { listProductGraphs } from "@/lib/product-engine/product-graph";

/** Analysis workspace — product profiles from Product Engine graph */
export function listAnalysisProductProfiles() {
  return listProductGraphs()
    .filter((g) => g.identity.isActive)
    .map((graph) => {
      const analysis = resolveAnalysisFromGraph({ productCode: graph.identity.productCode })!;
      const marketplace = resolveMarketplaceFromGraph({ productCode: graph.identity.productCode })!;
      return {
        productCode: graph.identity.productCode,
        displayName: graph.identity.displayName,
        category: graph.identity.category,
        analysisProfile: analysis.analysisProfile,
        costProfile: analysis.costProfile,
        profitProfile: analysis.profitProfile,
        marketplacePreset: marketplace.marketplacePreset,
        commissionProfile: marketplace.commissionProfile,
        pricingRuleCode: analysis.pricingRuleCode,
      };
    });
}

export function getAnalysisProfileForCategory(category: string) {
  return resolveAnalysisFromGraph({ category });
}
