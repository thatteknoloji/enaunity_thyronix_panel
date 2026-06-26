import { listCatalogFixedSizes } from "@/lib/pricing-engine/pod-price-catalog";
import { listPodProductProfiles } from "./product-profiles/pod-product-profile-registry";

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

  return listPodProductProfiles().map((profile) => ({
    id: profile.id,
    name: profile.name,
    category: profile.category,
    templateId: profile.templateId,
    catalogId: profile.catalogId,
    pricingRuleCode: profile.pricingRuleCode,
    formulaHint: profile.formulaHint,
    mockupType: profile.mockupType,
    status: profile.status,
    fixedSizeCount: profile.catalogId ? listCatalogFixedSizes(profile.catalogId).length : 0,
    studioHref: `${studioBase}${studioBase.includes("?") ? "&" : "?"}template=${profile.templateId}`,
  }));
}

export function podBasePath(role: PodUiRole): string {
  return role === "admin" ? "/admin/pod" : "/dealer/pod";
}
