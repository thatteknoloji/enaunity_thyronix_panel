import type { Prisma } from "@prisma/client";

const CAMPAIGN_SCALAR_KEYS = [
  "name", "description", "type", "discountType", "discountValue", "minAmount",
  "maxDiscount", "minQuantity", "bundlePrice", "startsAt", "endsAt", "active",
  "targetType", "targetIds", "categoryScope", "orderCountMin", "freeShipping",
  "badge", "badgeColor", "showOnHomepage", "bannerSlotKey",
  "bannerImageDesktop", "bannerImageTablet", "bannerImageMobile", "bannerLinkUrl",
] as const;

type CampaignScalarData = Omit<Prisma.CampaignCreateInput, "products" | "homepageBanners">;

export function parseCampaignPayload(body: Record<string, unknown>): Partial<CampaignScalarData> {
  const data: Partial<CampaignScalarData> = {};
  for (const key of CAMPAIGN_SCALAR_KEYS) {
    if (body[key] !== undefined) {
      if (key === "startsAt" || key === "endsAt") {
        data[key] = body[key] ? new Date(body[key] as string) : null;
      } else {
        (data as Record<string, unknown>)[key] = body[key];
      }
    }
  }
  return data;
}

export function buildCampaignProductCreates(buyProducts: unknown, getProducts: unknown) {
  const buy = Array.isArray(buyProducts) ? buyProducts : [];
  const get = Array.isArray(getProducts) ? getProducts : [];
  return [
    ...buy.map((productId: string) => ({ type: "buy" as const, productId, quantity: 1 })),
    ...get.map((productId: string) => ({ type: "get" as const, productId, quantity: 1 })),
  ];
}
