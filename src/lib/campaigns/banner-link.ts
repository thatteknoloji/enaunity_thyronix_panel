export type CampaignLinkSource = {
  id: string;
  type: string;
  categoryScope?: string;
  bannerLinkUrl?: string;
  products?: { productId: string; type: string }[];
};

function parseCategoryScope(raw?: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function campaignProductIds(campaign: CampaignLinkSource): string[] {
  const buy = (campaign.products || []).filter((p) => p.type === "buy").map((p) => p.productId);
  const get = (campaign.products || []).filter((p) => p.type === "get").map((p) => p.productId);
  const ids = buy.length ? buy : get.length ? get : (campaign.products || []).map((p) => p.productId);
  return [...new Set(ids)];
}

/** Otomatik banner linki — bannerLinkUrl doluysa kullanıcı tercihi geçerli. */
export function resolveCampaignBannerLink(campaign: CampaignLinkSource): string {
  const manual = campaign.bannerLinkUrl?.trim();
  if (manual) return manual;

  const q = `campaign=${encodeURIComponent(campaign.id)}`;

  if (campaign.type === "category_discount") {
    const cats = parseCategoryScope(campaign.categoryScope);
    if (cats.length === 1) {
      return `/catalog?category=${encodeURIComponent(cats[0])}&${q}`;
    }
    if (cats.length > 1) {
      return `/catalog?${q}`;
    }
  }

  const productIds = campaignProductIds(campaign);
  if (productIds.length === 1 && ["bogo", "bundle", "quantity_discount"].includes(campaign.type)) {
    return `/products/${productIds[0]}?${q}`;
  }
  if (productIds.length > 0 && ["bogo", "bundle", "quantity_discount"].includes(campaign.type)) {
    return `/catalog?${q}`;
  }

  return `/catalog?${q}`;
}

export function describeCampaignBannerLink(campaign: CampaignLinkSource): string {
  const manual = campaign.bannerLinkUrl?.trim();
  if (manual) return "Özel link kullanılıyor";

  if (campaign.type === "category_discount") {
    const cats = parseCategoryScope(campaign.categoryScope);
    if (cats.length === 1) return `${cats[0]} kategorisine yönlendirir`;
    if (cats.length > 1) return "Kampanya kategorilerindeki ürünleri listeler";
  }

  const productIds = campaignProductIds(campaign);
  if (productIds.length === 1) return "Kampanya ürün sayfasına yönlendirir";
  if (productIds.length > 1) return "Kampanyalı ürünleri katalogda filtreler";

  return "Tüm katalogda kampanya bilgisi gösterilir";
}

export function filterProductsForCampaign<T extends { id: string; category: string }>(
  products: T[],
  campaign: { type: string; categoryScope?: string; products?: { productId: string; type: string }[] },
): T[] {
  if (campaign.type === "category_discount") {
    const cats = parseCategoryScope(campaign.categoryScope);
    if (cats.length) return products.filter((p) => cats.includes(p.category));
  }

  if (["bogo", "bundle", "quantity_discount"].includes(campaign.type)) {
    const ids = new Set(campaignProductIds(campaign));
    if (ids.size) return products.filter((p) => ids.has(p.id));
  }

  return products;
}
