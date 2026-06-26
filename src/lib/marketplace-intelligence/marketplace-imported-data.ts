import type {
  MarketplaceCommissionEntry,
  MarketplaceId,
  MarketplaceServiceFee,
  MarketplaceSourceMeta,
  ShippingBracket,
  ShippingCarrierId,
} from "./marketplace-types";

import trendyolCommissions from "../../../data/marketplace-intelligence/trendyol-commissions-2026.json";
import hepsiburadaCommissions from "../../../data/marketplace-intelligence/hepsiburada-commissions-2026.json";
import n11Commissions from "../../../data/marketplace-intelligence/n11-commissions-2026.json";
import trendyolShipping from "../../../data/marketplace-intelligence/trendyol-shipping-2026-05-22.json";
import hepsiburadaShipping from "../../../data/marketplace-intelligence/hepsiburada-shipping-2026-01-02.json";
import ciceksepetiShipping from "../../../data/marketplace-intelligence/ciceksepeti-shipping-2026.json";
import n11Shipping from "../../../data/marketplace-intelligence/n11-shipping-2026.json";

type CommissionJson = {
  source: MarketplaceSourceMeta;
  entries: Array<{
    marketplace: MarketplaceId;
    mainCategory: string;
    subCategory: string;
    productGroup: string;
    ratePercent: number;
    vatIncluded: boolean;
    vatNote?: string;
    serviceFees?: MarketplaceServiceFee[];
  }>;
};

type ShippingJson = {
  source: MarketplaceSourceMeta;
  carriers?: Record<string, string>;
  brackets: ShippingBracket[];
};

function slugify(...parts: string[]): string {
  return parts
    .join("-")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildCommissionId(
  marketplace: MarketplaceId,
  mainCategory: string,
  subCategory: string,
  productGroup: string,
): string {
  const base = `${marketplace}-${slugify(mainCategory, subCategory)}`;
  if (productGroup && productGroup !== subCategory) {
    return `${base}-${slugify(productGroup).slice(0, 40)}`;
  }
  return base;
}

function loadCommissions(data: CommissionJson): MarketplaceCommissionEntry[] {
  const source = data.source;
  return data.entries.map((entry) => ({
    marketplace: entry.marketplace,
    categoryId: buildCommissionId(
      entry.marketplace,
      entry.mainCategory,
      entry.subCategory,
      entry.productGroup,
    ),
    mainCategory: entry.mainCategory,
    subCategory: entry.subCategory,
    productGroup: entry.productGroup,
    ratePercent: entry.ratePercent,
    vatIncluded: entry.vatIncluded,
    vatNote: entry.vatNote,
    serviceFees: entry.serviceFees ?? [],
    source,
  }));
}

export const IMPORTED_COMMISSIONS: MarketplaceCommissionEntry[] = [
  ...loadCommissions(trendyolCommissions as CommissionJson),
  ...loadCommissions(hepsiburadaCommissions as CommissionJson),
  ...loadCommissions(n11Commissions as CommissionJson),
];

export const COMMISSION_SOURCES: Record<MarketplaceId, MarketplaceSourceMeta | null> = {
  trendyol: (trendyolCommissions as CommissionJson).source,
  hepsiburada: (hepsiburadaCommissions as CommissionJson).source,
  n11: (n11Commissions as CommissionJson).source,
  ciceksepeti: null,
};

export const SHIPPING_DATASETS: ShippingJson[] = [
  trendyolShipping as ShippingJson,
  hepsiburadaShipping as ShippingJson,
  ciceksepetiShipping as ShippingJson,
  n11Shipping as ShippingJson,
];

export const SHIPPING_SOURCES: Partial<Record<MarketplaceId, MarketplaceSourceMeta>> = {
  trendyol: (trendyolShipping as ShippingJson).source,
  hepsiburada: (hepsiburadaShipping as ShippingJson).source,
  ciceksepeti: (ciceksepetiShipping as ShippingJson).source,
  n11: (n11Shipping as ShippingJson).source,
};

export function findCommissionByRef(
  marketplace: MarketplaceId,
  ref: { mainCategory: string; subCategory: string; productGroupMatch?: string },
): MarketplaceCommissionEntry | undefined {
  const candidates = IMPORTED_COMMISSIONS.filter(
    (e) =>
      e.marketplace === marketplace &&
      e.mainCategory === ref.mainCategory &&
      e.subCategory === ref.subCategory,
  );
  if (ref.productGroupMatch) {
    const match = candidates.find((e) =>
      e.productGroup.toLocaleLowerCase("tr-TR").includes(ref.productGroupMatch!.toLocaleLowerCase("tr-TR")),
    );
    if (match) return match;
  }
  return candidates[0];
}

export function getCarrierLabel(
  marketplace: MarketplaceId,
  carrier: ShippingCarrierId,
): string {
  for (const dataset of SHIPPING_DATASETS) {
    if (dataset.brackets[0]?.marketplace === marketplace) {
      const label = dataset.carriers?.[carrier];
      if (label) return label;
    }
  }
  const defaults: Record<ShippingCarrierId, string> = {
    yurtici: "Yurtiçi Kargo",
    aras: "Aras Kargo",
    mng: "MNG Kargo",
    surat: "Sürat Kargo",
    ptt: "PTT Kargo",
    kolay_gelsin: "Kolay Gelsin",
    dhl: "DHL eCommerce",
    ups: "UPS",
  };
  return defaults[carrier] || carrier;
}
