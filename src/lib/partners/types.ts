/** Partner Ecosystem — Faz 1 */

export const PARTNER_TYPES = [
  "CUSTOMER",
  "AFFILIATE",
  "BAYI_PLUS",
  "FRANCHISE",
  "POD_CREATOR",
  "AI_PARTNER",
] as const;

export type PartnerType = (typeof PARTNER_TYPES)[number];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  CUSTOMER: "Müşteri / Normal Bayi",
  AFFILIATE: "Affiliate Partner",
  BAYI_PLUS: "Bayi Plus",
  FRANCHISE: "Franchise Bayi",
  POD_CREATOR: "POD Creator",
  AI_PARTNER: "AI Partner",
};

export const PARTNER_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const REFERRAL_STATUSES = [
  "VISIT",
  "REGISTERED",
  "LICENSED",
  "FIRST_ORDER",
  "CONVERTED",
  "CANCELLED",
] as const;

export const COMMISSION_TYPES = [
  "FIRST_ORDER",
  "RECURRING_ORDER",
  "MODULE_LICENSE",
  "POD_ORDER",
  "MANUAL",
] as const;

export const COMMISSION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PAID"] as const;
export const PAYOUT_STATUSES = ["REQUESTED", "PROCESSING", "PAID", "CANCELLED"] as const;

export const REFERRAL_COOKIE = "ena_ref";
export const REFERRAL_COOKIE_DAYS = 30;

/** Varsayılan komisyon oranları (admin override yoksa) */
export const DEFAULT_COMMISSION_RATES: Record<
  PartnerType,
  { first: number; recurring: number; module?: number; pod?: number }
> = {
  CUSTOMER: { first: 0, recurring: 0 },
  AFFILIATE: { first: 0.1, recurring: 0.03, module: 0.1 },
  BAYI_PLUS: { first: 0.08, recurring: 0.02 },
  FRANCHISE: { first: 0.05, recurring: 0.02 },
  POD_CREATOR: { first: 0, recurring: 0, pod: 0.15 },
  AI_PARTNER: { first: 0, recurring: 0, module: 0.1 },
};

export type PartnerProfileMetadata = {
  isHybridDealerAffiliate?: boolean;
  parentPartnerId?: string;
  notes?: string;
  linkslashLicenseId?: string;
};
