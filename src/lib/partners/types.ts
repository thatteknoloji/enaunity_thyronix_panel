/** Partner Ecosystem V2 — Bayi Ağı / Referans */

export const PARTNER_TYPES_V2 = [
  "PROFESSIONAL_DEALER",
  "SOCIAL_DEALER",
  "POD_CREATOR",
  "AI_PARTNER",
] as const;

export type PartnerTypeV2 = (typeof PARTNER_TYPES_V2)[number];

/** Prisma enum — legacy değerler dahil */
export type PartnerType =
  | PartnerTypeV2
  | "CUSTOMER"
  | "AFFILIATE"
  | "BAYI_PLUS"
  | "FRANCHISE";

export const PARTNER_TYPE_LABELS: Record<string, string> = {
  PROFESSIONAL_DEALER: "Profesyonel Bayi",
  SOCIAL_DEALER: "Sosyal Bayi",
  POD_CREATOR: "POD Creator",
  AI_PARTNER: "AI Partner",
  CUSTOMER: "Profesyonel Bayi",
  AFFILIATE: "Sosyal Bayi",
  BAYI_PLUS: "Profesyonel Bayi",
  FRANCHISE: "Profesyonel Bayi",
};

export const PARTNER_TYPE_DESCRIPTIONS: Record<PartnerTypeV2, string> = {
  PROFESSIONAL_DEALER: "Vergi levhası olan profesyonel bayi — ürün alır, satar, iskonto alır",
  SOCIAL_DEALER: "Referans kodu ile bayi kazandırır, komisyon kazanır",
  POD_CREATOR: "Tasarım / POD ürün partneri — satış altyapısı yakında",
  AI_PARTNER: "LinkSlash, HIVE, Thyronix modül satışlarından komisyon",
};

/** Legacy → V2 */
export function normalizePartnerType(raw: string): PartnerTypeV2 {
  const map: Record<string, PartnerTypeV2> = {
    PROFESSIONAL_DEALER: "PROFESSIONAL_DEALER",
    SOCIAL_DEALER: "SOCIAL_DEALER",
    POD_CREATOR: "POD_CREATOR",
    AI_PARTNER: "AI_PARTNER",
    CUSTOMER: "PROFESSIONAL_DEALER",
    AFFILIATE: "SOCIAL_DEALER",
    BAYI_PLUS: "PROFESSIONAL_DEALER",
    FRANCHISE: "PROFESSIONAL_DEALER",
  };
  return map[raw] || "SOCIAL_DEALER";
}

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

/** UI: PartnerCommission — DB: AffiliateCommission */
export const COMMISSION_TYPE_LABELS: Record<string, string> = {
  PRODUCT_ORDER: "Ürün Siparişi",
  MODULE_LICENSE: "Modül Lisansı",
  POD_SALE: "POD Satışı",
  POD_ORDER: "POD Satışı",
  NETWORK_OVERRIDE: "Ağ Override",
  FIRST_ORDER: "İlk Sipariş",
  RECURRING_ORDER: "Tekrarlayan Sipariş",
  MANUAL: "Manuel",
};

export const COMMISSION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PAID"] as const;
export const PAYOUT_STATUSES = ["REQUESTED", "PROCESSING", "PAID", "CANCELLED"] as const;

export const REFERRAL_COOKIE = "ena_ref";
export const REFERRAL_COOKIE_DAYS = 30;

export type PartnerRateProfile = {
  partnerType: string;
  defaultCommissionRate?: number;
  moduleCommissionRate?: number;
  podCommissionRate?: number;
  networkOverrideRate?: number;
  commissionRate?: number;
  recurringCommissionRate?: number;
};

/** Varsayılan oranlar (admin override yoksa) — oranlar 0-1 arası */
export const DEFAULT_RATES: Record<
  PartnerTypeV2,
  {
    firstOrder: number;
    recurringOrder: number;
    module: number;
    pod: number;
    networkOverride: number;
  }
> = {
  PROFESSIONAL_DEALER: {
    firstOrder: 0,
    recurringOrder: 0,
    module: 0.05,
    pod: 0,
    networkOverride: 0.01,
  },
  SOCIAL_DEALER: {
    firstOrder: 0.02,
    recurringOrder: 0.01,
    module: 0.1,
    pod: 0,
    networkOverride: 0,
  },
  POD_CREATOR: {
    firstOrder: 0,
    recurringOrder: 0,
    module: 0,
    pod: 0.15,
    networkOverride: 0.01,
  },
  AI_PARTNER: {
    firstOrder: 0,
    recurringOrder: 0,
    module: 0.1,
    pod: 0,
    networkOverride: 0,
  },
};

export function resolvePartnerRates(profile: PartnerRateProfile) {
  const type = normalizePartnerType(profile.partnerType);
  const d = DEFAULT_RATES[type];
  return {
    firstOrder:
      profile.commissionRate && profile.commissionRate > 0
        ? profile.commissionRate
        : profile.defaultCommissionRate && profile.defaultCommissionRate > 0
          ? profile.defaultCommissionRate
          : d.firstOrder,
    recurringOrder:
      profile.recurringCommissionRate && profile.recurringCommissionRate > 0
        ? profile.recurringCommissionRate
        : d.recurringOrder,
    module:
      profile.moduleCommissionRate && profile.moduleCommissionRate > 0
        ? profile.moduleCommissionRate
        : d.module,
    pod:
      profile.podCommissionRate && profile.podCommissionRate > 0
        ? profile.podCommissionRate
        : d.pod,
    networkOverride:
      profile.networkOverrideRate && profile.networkOverrideRate > 0
        ? profile.networkOverrideRate
        : d.networkOverride,
  };
}

export type PartnerProfileMetadata = {
  socialMedia?: string;
  hasTaxPlate?: boolean;
  applicationNote?: string;
  linkslashLicenseId?: string;
  qrPlaceholder?: boolean;
  payoutSettings?: PartnerPayoutSettings;
};

export type PartnerPayoutSettings = {
  iban?: string;
  accountHolder?: string;
  taxIdentityNumber?: string;
  payoutMinAmount?: number;
  invoiceRequired?: boolean;
};

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Talep Edildi",
  PROCESSING: "İşleniyor",
  PAID: "Ödendi",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal Edildi",
};

/** Varsayılan ödeme kuralları — admin partner bazlı override edebilir */
export const DEFAULT_PAYOUT_RULES: Record<
  PartnerTypeV2,
  { payoutMinAmount: number; invoiceRequired: boolean }
> = {
  SOCIAL_DEALER: { payoutMinAmount: 500, invoiceRequired: false },
  PROFESSIONAL_DEALER: { payoutMinAmount: 1000, invoiceRequired: true },
  POD_CREATOR: { payoutMinAmount: 500, invoiceRequired: false },
  AI_PARTNER: { payoutMinAmount: 1000, invoiceRequired: true },
};

export const PREMIUM_MODULES = [
  { key: "LINKSLASH", label: "LinkSlash", path: "/platform/linkslash" },
  { key: "HIVE", label: "HIVE", path: "/platform/hive" },
  { key: "THYRONIX", label: "Thyronix", path: "/platform/thyronix" },
] as const;

export function inferPartnerTypeFromApplication(input: {
  requestedType?: string;
  hasTaxPlate?: boolean;
}): PartnerTypeV2 {
  const req = input.requestedType ? normalizePartnerType(input.requestedType) : null;
  if (req === "POD_CREATOR" || req === "AI_PARTNER") return req;
  if (input.hasTaxPlate) return "PROFESSIONAL_DEALER";
  return req || "SOCIAL_DEALER";
}
