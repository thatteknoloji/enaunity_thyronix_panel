import type { ProductShowcaseDTO } from "./types";
import type { PlatformContent } from "./platform-content";
import { resolvePlanCheckoutUrl, resolvePricingSecondaryUrl } from "./plan-urls";

/** Statik platform şablonu + admin vitrin düzenlemelerini birleştirir */
export function mergePlatformWithShowcase(
  staticContent: PlatformContent,
  showcase: ProductShowcaseDTO,
): PlatformContent {
  const slug = staticContent.slug;
  const plansSource = showcase.plans.length > 0 ? showcase.plans : staticContent.plans;
  const plans = [...plansSource]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((plan, index) => ({
      ...plan,
      ctaUrl: resolvePlanCheckoutUrl(slug, plan, index),
    }));

  return {
    ...staticContent,
    name: showcase.name || staticContent.name,
    subtitle: showcase.shortDescription || staticContent.subtitle,
    description: showcase.longDescription || staticContent.description,
    icon: showcase.icon || staticContent.icon,
    themeColor: showcase.themeColor || staticContent.themeColor,
    accentColor: showcase.accentColor || staticContent.accentColor,
    badgeText: showcase.badgeText || staticContent.badgeText,
    cardFeatures: showcase.cardFeatures.length > 0 ? showcase.cardFeatures : staticContent.cardFeatures,
    hero: {
      title: showcase.heroTitle || staticContent.hero.title,
      subtitle: showcase.heroSubtitle || staticContent.hero.subtitle,
      description: showcase.heroDescription || staticContent.hero.description,
    },
    features: (showcase.features.length > 0 ? showcase.features : staticContent.features).map((f) => ({
      title: f.title,
      description: f.description || "",
      icon: f.icon,
    })),
    plans,
    faq: showcase.faq.length > 0 ? showcase.faq : staticContent.faq,
    cta: {
      ...staticContent.cta,
      primaryText:
        slug === "linkslash"
          ? staticContent.cta.primaryText
          : showcase.ctaText || staticContent.cta.primaryText,
      primaryUrl: staticContent.cta.primaryUrl,
      secondaryText: slug === "linkslash" ? "İndirmeler" : staticContent.cta.secondaryText,
      secondaryUrl: slug === "linkslash" ? "/linkslash/downloads" : resolvePricingSecondaryUrl(slug),
    },
  };
}
