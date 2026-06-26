import { THYRONIX_MARKETPLACE_PRESETS } from "@/lib/thyronix/analysis-presets";
import { marketplaceSlugForCategory } from "./product-graph-builder";
import type { ProductEngineMarketplace, ProductEngineMarketplaceChannel } from "./types";

function emptyChannel(): ProductEngineMarketplaceChannel {
  return {
    enabled: false,
    categoryId: "",
    categoryLabel: "",
    commissionPercent: 0,
    cargoProfile: "",
  };
}

export function buildMarketplaceDefaults(categoryName: string): ProductEngineMarketplace {
  const slug = marketplaceSlugForCategory(categoryName);

  const build = (marketplaceId: string): ProductEngineMarketplaceChannel => {
    const mp = THYRONIX_MARKETPLACE_PRESETS.find((p) => p.value === marketplaceId);
    const cat = mp?.categories.find((c) => c.value === slug) ?? mp?.categories.find((c) => c.value === "genel");
    return {
      enabled: false,
      categoryId: cat?.value ?? slug,
      categoryLabel: cat?.label ?? categoryName,
      commissionPercent: cat?.commission ?? 0,
      cargoProfile: "",
    };
  };

  return {
    trendyol: build("trendyol"),
    hepsiburada: build("hepsiburada"),
    n11: build("n11"),
    ciceksepeti: {
      ...emptyChannel(),
      categoryId: slug,
      categoryLabel: categoryName,
      commissionPercent: 17,
    },
  };
}
