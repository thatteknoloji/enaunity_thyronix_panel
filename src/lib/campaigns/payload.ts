const CAMPAIGN_SCALAR_KEYS = [
  "name", "description", "type", "discountType", "discountValue", "minAmount",
  "maxDiscount", "minQuantity", "bundlePrice", "startsAt", "endsAt", "active",
  "targetType", "targetIds", "categoryScope", "orderCountMin", "freeShipping",
  "badge", "badgeColor", "showOnHomepage", "bannerSlotKey",
  "bannerImageDesktop", "bannerImageTablet", "bannerImageMobile", "bannerLinkUrl",
] as const;

export function parseCampaignPayload(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const key of CAMPAIGN_SCALAR_KEYS) {
    if (body[key] !== undefined) {
      if (key === "startsAt" || key === "endsAt") {
        data[key] = body[key] ? new Date(body[key] as string) : null;
      } else {
        data[key] = body[key];
      }
    }
  }
  return data;
}
