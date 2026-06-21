import type { ShowcasePlan } from "./types";

const MODULE_BY_SLUG: Record<string, string> = {
  thyronix: "THYRONIX",
  hive: "HIVE",
  linkslash: "LINKSLASH",
};

const DEFAULT_PLAN_KEYS: Record<string, string[]> = {
  thyronix: ["starter", "pro", "enterprise"],
  hive: ["starter", "growth", "dominance"],
  linkslash: ["starter", "pro", "pro"],
};

/** Eski /thyronix/pricing veya boş CTA → ödeme checkout */
export function resolvePlanCheckoutUrl(
  platformSlug: string,
  plan: ShowcasePlan,
  index: number,
): string {
  const url = (plan.ctaUrl || "").trim();
  if (url.includes("/payment/checkout")) return url;
  if (url && !url.endsWith("/pricing")) return url;

  const moduleKey = MODULE_BY_SLUG[platformSlug];
  const keys = DEFAULT_PLAN_KEYS[platformSlug];
  if (moduleKey && keys?.length) {
    const planKey = keys[Math.min(index, keys.length - 1)];
    return `/payment/checkout?type=module&moduleKey=${moduleKey}&planKey=${planKey}`;
  }
  return url || "#";
}

export function resolvePricingSecondaryUrl(platformSlug: string): string {
  const moduleKey = MODULE_BY_SLUG[platformSlug];
  if (moduleKey) return `#plans`;
  return "#plans";
}
