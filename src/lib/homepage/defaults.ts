export const DEFAULT_HOME_CATEGORIES = [
  "Cam Tablo",
  "Mdf Tablo",
  "Halı",
  "Kilim",
  "Perde",
  "Nevresim",
  "Yastık Kılıfı",
  "Minder",
  "Puzzle",
  "Hediyelik Ürünler",
];

export const DEFAULT_BANNER_SLOTS = [
  { key: "after_hero", label: "Hero Altı", placement: "after_hero", displayMode: "carousel", sortOrder: 0 },
  { key: "after_features", label: "Özellik Kartları Altı", placement: "after_features", displayMode: "single", sortOrder: 1 },
  { key: "after_search", label: "Arama Bölümü Altı", placement: "after_search", displayMode: "carousel", sortOrder: 2 },
  { key: "before_ecosystem", label: "Ekosistem Vitrini Öncesi", placement: "before_ecosystem", displayMode: "grid", gridColumns: 2, sortOrder: 3 },
  { key: "before_partners", label: "İş Ortakları Öncesi", placement: "before_partners", displayMode: "strip", sortOrder: 4 },
  { key: "between_categories", label: "Kategori Satırları Arası", placement: "between_categories", displayMode: "carousel", sortOrder: 5 },
  { key: "before_cta", label: "Alt CTA Öncesi", placement: "before_cta", displayMode: "single", sortOrder: 6 },
] as const;

export const DEFAULT_HERO = {
  heroVideoDesktop: "/hero-bg.mp4",
  heroVideoMobile: "/hero-bg-mobile.mp4",
  heroPoster: "",
  heroBadge: "",
  heroDescription: "",
  heroCtaPrimaryLabel: "",
  heroCtaPrimaryUrl: "/catalog",
  heroCtaSecondaryLabel: "",
  heroCtaSecondaryUrl: "/auth/register",
  useCustomHeroText: false,
};
