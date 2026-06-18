export const SHOWCASE_STATUSES = ["ACTIVE", "COMING_SOON", "HIDDEN", "ARCHIVED"] as const;
export type ShowcaseStatus = (typeof SHOWCASE_STATUSES)[number];

export type ShowcaseFeature = {
  title: string;
  description?: string;
  icon?: string;
};

export type ShowcaseFaq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  active: boolean;
};

export type ShowcasePlan = {
  id: string;
  name: string;
  description?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  features: string[];
  highlighted?: boolean;
  ctaText?: string;
  ctaUrl?: string;
  sortOrder: number;
};

export type ShowcaseGalleryItem = {
  url: string;
  alt?: string;
};

export type ProductShowcaseDTO = {
  id: string;
  name: string;
  slug: string;
  status: ShowcaseStatus;
  sortOrder: number;
  isFeatured: boolean;
  icon: string;
  themeColor: string;
  accentColor: string;
  shortDescription: string;
  longDescription: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  ctaText: string;
  ctaUrl: string;
  productUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  features: ShowcaseFeature[];
  cardFeatures: string[];
  faq: ShowcaseFaq[];
  plans: ShowcasePlan[];
  gallery: ShowcaseGalleryItem[];
  badgeText: string;
  comingSoonText: string;
  featuresSectionTitle: string;
  plansSectionTitle: string;
  faqSectionTitle: string;
  gallerySectionTitle: string;
  maxCardChips: number;
  showPriceOnCard: boolean;
  linkTarget: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductShowcaseInput = Partial<Omit<ProductShowcaseDTO, "id" | "createdAt" | "updatedAt">> & {
  name?: string;
  slug?: string;
};
