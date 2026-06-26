import { THYRONIX_MARKETPLACE_PRESETS } from "@/lib/thyronix/analysis-presets";
import type { ProductEngineMarketplace, ProductEngineMarketplaceChannel } from "./types";

const CATEGORY_SLUG_MAP: Record<string, string> = {
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
  const slug = CATEGORY_SLUG_MAP[categoryName] ?? "genel";

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
