import type { EnaProductSlug, MarketplaceCategoryNode, MarketplaceId } from "./marketplace-types";

const MARKETPLACE_LABELS: Record<MarketplaceId, string> = {
  trendyol: "Trendyol",
  hepsiburada: "Hepsiburada",
  n11: "N11",
  ciceksepeti: "ÇiçekSepeti",
};

function cat(
  marketplace: MarketplaceId,
  id: string,
  name: string,
  path: string,
  enaSlug: EnaProductSlug,
  searchTerms: string[],
  commissionRef?: MarketplaceCategoryNode["commissionRef"],
): MarketplaceCategoryNode {
  return { id, marketplace, name, path, enaSlug, searchTerms, commissionRef };
}

/** ENA ürün → pazaryeri kategori eşlemeleri (gerçek kaynak path'leri) */
export const MARKETPLACE_CATEGORY_CACHE: MarketplaceCategoryNode[] = [
  // ── Trendyol ──
  cat("trendyol", "ty-cam-tablo", "Cam Tablo", "Ev > Ev Dekorasyon > Tablo", "cam-tablo", ["cam tablo", "cam", "glass", "uv baskı", "tablo"], {
    mainCategory: "Ev", subCategory: "Ev Dekorasyon", productGroupMatch: "Tablo",
  }),
  cat("trendyol", "ty-mdf-tablo", "MDF Tablo", "Ev > Ev Dekorasyon > Tablo", "mdf-tablo", ["mdf tablo", "mdf", "ahşap tablo"], {
    mainCategory: "Ev", subCategory: "Ev Dekorasyon", productGroupMatch: "Tablo",
  }),
  cat("trendyol", "ty-hali", "Halı", "Ev > Halı/Kilim", "hali", ["halı", "carpet", "salon halısı"], {
    mainCategory: "Ev", subCategory: "Halı/Kilim",
  }),
  cat("trendyol", "ty-kilim", "Kilim", "Ev > Halı/Kilim", "kilim", ["kilim", "rug"], {
    mainCategory: "Ev", subCategory: "Halı/Kilim",
  }),
  cat("trendyol", "ty-perde", "Perde", "Ev > Perde", "perde", ["perde", "curtain", "tül"], {
    mainCategory: "Ev", subCategory: "Perde",
  }),
  cat("trendyol", "ty-kirlent", "Kırlent", "Ev > Ev Dekorasyon > Kırlent", "kirlent", ["kırlent", "yastık", "cushion"], {
    mainCategory: "Ev", subCategory: "Ev Dekorasyon", productGroupMatch: "Kırlent",
  }),
  cat("trendyol", "ty-nevresim", "Nevresim Takımı", "Ev > Ev Tekstili", "nevresim", ["nevresim", "yatak takımı"], {
    mainCategory: "Ev", subCategory: "Ev Tekstili",
  }),
  cat("trendyol", "ty-poster", "Poster", "Ev > Ev Dekorasyon", "poster", ["poster", "duvar posteri"], {
    mainCategory: "Ev", subCategory: "Ev Dekorasyon",
  }),
  cat("trendyol", "ty-kupa", "Kupa", "Ev > Sofra & Mutfak", "kupa", ["kupa", "mug"], {
    mainCategory: "Ev", subCategory: "Sofra & Mutfak",
  }),
  cat("trendyol", "ty-dekor", "Dekorasyon", "Ev > Ev Dekorasyon", "dekor", ["dekor", "dekorasyon"], {
    mainCategory: "Ev", subCategory: "Ev Dekorasyon",
  }),

  // ── Hepsiburada ──
  cat("hepsiburada", "hb-cam-tablo", "Cam Tablo", "Ev Dekorasyon > Tablo", "cam-tablo", ["cam tablo", "cam"], {
    mainCategory: "Ev Dekorasyon", subCategory: "Tablo",
  }),
  cat("hepsiburada", "hb-mdf-tablo", "MDF Tablo", "Ev Dekorasyon > Tablo", "mdf-tablo", ["mdf tablo", "mdf"], {
    mainCategory: "Ev Dekorasyon", subCategory: "Tablo",
  }),
  cat("hepsiburada", "hb-hali", "Halı & Kilim", "Ev Tekstili > Halı & Kilim", "hali", ["halı", "kilim"], {
    mainCategory: "Ev Tekstili", subCategory: "Halı & Kilim",
  }),
  cat("hepsiburada", "hb-kilim", "Kilim", "Ev Tekstili > Halı & Kilim", "kilim", ["kilim"], {
    mainCategory: "Ev Tekstili", subCategory: "Halı & Kilim",
  }),
  cat("hepsiburada", "hb-perde", "Perde", "Ev Tekstili > Perde", "perde", ["perde"], {
    mainCategory: "Ev Tekstili", subCategory: "Perde",
  }),
  cat("hepsiburada", "hb-kirlent", "Kırlent", "Ev Tekstili > Yatak Odası Tekstili", "kirlent", ["kırlent", "yastık"], {
    mainCategory: "Ev Tekstili", subCategory: "Yatak Odası Tekstili", productGroupMatch: "Kırlent",
  }),
  cat("hepsiburada", "hb-nevresim", "Nevresim", "Ev Tekstili > Yatak Odası Tekstili", "nevresim", ["nevresim"], {
    mainCategory: "Ev Tekstili", subCategory: "Yatak Odası Tekstili",
  }),
  cat("hepsiburada", "hb-yatak-odasi", "Yatak Odası Tekstili", "Ev Tekstili > Yatak Odası Tekstili", "nevresim", ["yatak odası tekstili", "nevresim", "yorgan"], {
    mainCategory: "Ev Tekstili", subCategory: "Yatak Odası Tekstili",
  }),
  cat("hepsiburada", "hb-poster", "Poster", "Ev Dekorasyon > Poster", "poster", ["poster"], {
    mainCategory: "Ev Dekorasyon", subCategory: "Poster",
  }),
  cat("hepsiburada", "hb-kupa", "Kupa", "Mutfak > Kupa", "kupa", ["kupa"], {
    mainCategory: "Mutfak", subCategory: "Kupa",
  }),
  cat("hepsiburada", "hb-dekor", "Dekorasyon", "Ev Dekorasyon", "dekor", ["dekor"], {
    mainCategory: "Ev Dekorasyon", subCategory: "Dekorasyon",
  }),

  // ── N11 ──
  cat("n11", "n11-cam-tablo", "Cam Tablo", "Dekorasyon & Aydınlatma > Tablo", "cam-tablo", ["cam tablo", "cam"], {
    mainCategory: "Dekorasyon & Aydınlatma", subCategory: "Tablo",
  }),
  cat("n11", "n11-mdf-tablo", "MDF Tablo", "Dekorasyon & Aydınlatma > Tablo", "mdf-tablo", ["mdf tablo"], {
    mainCategory: "Dekorasyon & Aydınlatma", subCategory: "Tablo",
  }),
  cat("n11", "n11-hali", "Halı & Kilim", "Ev Tekstili > Halı & Kilim", "hali", ["halı"], {
    mainCategory: "Ev Tekstili", subCategory: "Halı & Kilim",
  }),
  cat("n11", "n11-kilim", "Kilim", "Ev Tekstili > Halı & Kilim", "kilim", ["kilim"], {
    mainCategory: "Ev Tekstili", subCategory: "Halı & Kilim",
  }),
  cat("n11", "n11-perde", "Perde", "Ev Tekstili > Perde", "perde", ["perde"], {
    mainCategory: "Ev Tekstili", subCategory: "Perde",
  }),
  cat("n11", "n11-kirlent", "Kırlent", "Ev Tekstili > Yatak Odası Tekstili", "kirlent", ["kırlent"], {
    mainCategory: "Ev Tekstili", subCategory: "Yatak Odası Tekstili",
  }),
  cat("n11", "n11-nevresim", "Nevresim", "Ev Tekstili > Yatak Odası Tekstili", "nevresim", ["nevresim"], {
    mainCategory: "Ev Tekstili", subCategory: "Yatak Odası Tekstili",
  }),
  cat("n11", "n11-poster", "Poster", "Hobi & Oyun > Poster", "poster", ["poster"], {
    mainCategory: "Hobi & Oyun", subCategory: "Poster",
  }),
  cat("n11", "n11-kupa", "Kupa", "Mutfak Gereçleri > Kupa & Bardak", "kupa", ["kupa"], {
    mainCategory: "Mutfak Gereçleri", subCategory: "Kupa & Bardak",
  }),
  cat("n11", "n11-dekor", "Dekorasyon", "Dekorasyon & Aydınlatma", "dekor", ["dekor"], {
    mainCategory: "Dekorasyon & Aydınlatma", subCategory: "Duvar Dekorasyonu",
  }),

  // ── ÇiçekSepeti (komisyon kaynağı yok — sadece kargo) ──
  cat("ciceksepeti", "cs-cam-tablo", "Cam Tablo", "Ev & Yaşam > Dekorasyon > Cam Tablo", "cam-tablo", ["cam tablo", "cam"]),
  cat("ciceksepeti", "cs-mdf-tablo", "MDF Tablo", "Ev & Yaşam > Dekorasyon > MDF Tablo", "mdf-tablo", ["mdf tablo"]),
  cat("ciceksepeti", "cs-hali", "Halı", "Ev & Yaşam > Halı", "hali", ["halı"]),
  cat("ciceksepeti", "cs-kilim", "Kilim", "Ev & Yaşam > Kilim", "kilim", ["kilim"]),
  cat("ciceksepeti", "cs-perde", "Perde", "Ev & Yaşam > Perde", "perde", ["perde"]),
  cat("ciceksepeti", "cs-kirlent", "Kırlent", "Ev & Yaşam > Kırlent", "kirlent", ["kırlent"]),
  cat("ciceksepeti", "cs-nevresim", "Nevresim", "Ev & Yaşam > Nevresim", "nevresim", ["nevresim"]),
  cat("ciceksepeti", "cs-poster", "Poster", "Ev & Yaşam > Poster", "poster", ["poster"]),
  cat("ciceksepeti", "cs-kupa", "Kupa", "Hediye > Kupa", "kupa", ["kupa"]),
  cat("ciceksepeti", "cs-dekor", "Dekorasyon", "Ev & Yaşam > Dekorasyon", "dekor", ["dekor"]),
];

export function listMarketplaceLabels(): Array<{ id: MarketplaceId; label: string }> {
  return (Object.keys(MARKETPLACE_LABELS) as MarketplaceId[]).map((id) => ({
    id,
    label: MARKETPLACE_LABELS[id],
  }));
}

export function getMarketplaceLabel(id: MarketplaceId): string {
  return MARKETPLACE_LABELS[id];
}

export function getCategoryById(id: string): MarketplaceCategoryNode | undefined {
  return MARKETPLACE_CATEGORY_CACHE.find((node) => node.id === id);
}

export function resolveDefaultCategoryId(
  marketplace: MarketplaceId,
  enaSlug: EnaProductSlug,
): string | null {
  const hit = MARKETPLACE_CATEGORY_CACHE.find(
    (node) => node.marketplace === marketplace && node.enaSlug === enaSlug,
  );
  return hit?.id ?? null;
}

export function findEnaSlugFromText(text: string): EnaProductSlug | null {
  const q = text.toLocaleLowerCase("tr-TR");
  const rules: Array<[EnaProductSlug, string[]]> = [
    ["cam-tablo", ["cam tablo", "camtablo"]],
    ["cam-yuvarlak", ["yuvarlak cam", "round cam"]],
    ["mdf-tablo", ["mdf tablo", "mdf"]],
    ["hali", ["halı", "hali"]],
    ["kilim", ["kilim"]],
    ["perde", ["perde"]],
    ["kirlent", ["kırlent", "kirlent", "yastık"]],
    ["nevresim", ["nevresim"]],
    ["poster", ["poster"]],
    ["kupa", ["kupa", "mug"]],
    ["dekor", ["dekor"]],
  ];
  for (const [slug, terms] of rules) {
    if (terms.some((t) => q.includes(t))) return slug;
  }
  return null;
}
