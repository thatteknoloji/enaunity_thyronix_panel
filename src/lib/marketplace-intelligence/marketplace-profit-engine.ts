import { getCommissionEntry } from "./marketplace-commission-cache";
import { getCategoryById } from "./marketplace-category-cache";
import {
  getShippingPrice,
  getShippingSourceMeta,
  getShippingTable,
  SHIPPING_CARRIER_LABELS,
} from "./marketplace-shipping-cache";
import { getCommissionSourceMeta } from "./marketplace-commission-cache";
import type {
  MarketplaceId,
  MarketplaceServiceFee,
  ProfitCalculationInput,
  ProfitCalculationResult,
  ProfitRiskLabel,
  ShippingCarrierId,
} from "./marketplace-types";

const DEFAULT_TARGET_MARGIN = 22;
const DEFAULT_VAT_FOR_SERVICE_FEES = 20;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveRiskLabel(marginPercent: number): ProfitRiskLabel {
  if (marginPercent < 0) return "Zarar riski";
  if (marginPercent < 10) return "Düşük marj";
  if (marginPercent < 20) return "Orta risk";
  return "Sağlıklı";
}

function calcVatIncluded(amount: number, vatRatePercent: number): number {
  if (amount <= 0 || vatRatePercent <= 0) return 0;
  return amount - amount / (1 + vatRatePercent / 100);
}

function calcServiceFeeAmount(
  salePrice: number,
  fee: MarketplaceServiceFee,
  vatRatePercent: number,
): number {
  const base = salePrice * (fee.ratePercent / 100);
  if (fee.vatIncluded) return round2(base);
  const vat = base * (vatRatePercent / 100);
  return round2(base + vat);
}

export function calculateMarketplaceProfit(
  input: ProfitCalculationInput,
): ProfitCalculationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const empty: ProfitCalculationResult = {
    ready: false,
    errors,
    warnings,
    commissionRatePercent: null,
    commissionAmount: 0,
    marketingServiceFee: 0,
    marketplaceServiceFee: 0,
    shippingAmount: null,
    vatAmount: 0,
    adAmount: 0,
    campaignDiscountAmount: 0,
    packagingCost: 0,
    productCost: 0,
    extraFixedCost: 0,
    totalExpense: 0,
    netProfit: 0,
    profitMarginPercent: 0,
    breakEvenPrice: null,
    suggestedSalePrice: null,
    riskLabel: null,
    categoryLabel: null,
    carrierLabel: null,
    commissionSource: null,
    shippingSource: null,
    dataConfidence: null,
  };

  if (!input.marketplace) {
    errors.push("Pazaryeri seçilmeli");
    return empty;
  }

  if (!input.categoryId) {
    errors.push("Kategori seçilmeli");
    return empty;
  }

  const category = getCategoryById(input.categoryId);
  if (!category || category.marketplace !== input.marketplace) {
    errors.push("Kategori seçilmeli");
    return empty;
  }

  const commissionEntry = getCommissionEntry(input.marketplace as MarketplaceId, input.categoryId);
  if (!commissionEntry) {
    errors.push("Komisyon tanımlı değil");
    return { ...empty, categoryLabel: category.name };
  }

  if (!input.carrier) {
    errors.push("Kargo firması seçilmeli");
    return {
      ...empty,
      categoryLabel: category.name,
      commissionRatePercent: commissionEntry.ratePercent,
      commissionSource: commissionEntry.source,
      dataConfidence: commissionEntry.source.confidence,
    };
  }

  const shippingAmount = getShippingPrice(
    input.marketplace as MarketplaceId,
    input.carrier as ShippingCarrierId,
    input.desi,
  );
  const shippingTable = getShippingTable(
    input.marketplace as MarketplaceId,
    input.carrier as ShippingCarrierId,
  );

  if (shippingAmount === null) {
    errors.push("Kargo fiyatı tanımlı değil");
    return {
      ...empty,
      categoryLabel: category.name,
      commissionRatePercent: commissionEntry.ratePercent,
      carrierLabel: SHIPPING_CARRIER_LABELS[input.carrier as ShippingCarrierId] || input.carrier,
      commissionSource: commissionEntry.source,
      dataConfidence: commissionEntry.source.confidence,
    };
  }

  const salePrice = Math.max(0, input.salePrice);
  const productCost = Math.max(0, input.productCost);
  const packagingCost = Math.max(0, input.packagingCost);
  const extraFixedCost = Math.max(0, input.extraFixedCost);
  const vatRate = Math.max(0, input.vatRatePercent);
  const adRate = Math.max(0, input.adRatePercent);
  const campaignRate = Math.max(0, input.campaignDiscountPercent);
  const targetMargin = input.targetMarginPercent ?? DEFAULT_TARGET_MARGIN;
  const serviceVatRate = DEFAULT_VAT_FOR_SERVICE_FEES;

  if (salePrice <= 0) {
    warnings.push("Satış fiyatı girilmedi — net kâr hesaplanamaz");
  }

  const commissionRate = commissionEntry.ratePercent;
  const commissionAmount = round2(salePrice * (commissionRate / 100));

  let marketingServiceFee = 0;
  let marketplaceServiceFee = 0;
  for (const fee of commissionEntry.serviceFees) {
    const amount = calcServiceFeeAmount(salePrice, fee, serviceVatRate);
    if (fee.id === "marketing") marketingServiceFee = amount;
    else if (fee.id === "marketplace") marketplaceServiceFee = amount;
  }

  const adAmount = round2(salePrice * (adRate / 100));
  const campaignDiscountAmount = round2(salePrice * (campaignRate / 100));
  const vatAmount = round2(calcVatIncluded(salePrice, vatRate));

  const serviceFeeRate =
    commissionEntry.serviceFees.reduce((sum, fee) => {
      const effectiveRate = fee.vatIncluded
        ? fee.ratePercent
        : fee.ratePercent * (1 + serviceVatRate / 100);
      return sum + effectiveRate;
    }, 0) / 100;

  const vatFactor = vatRate > 0 ? 1 - 1 / (1 + vatRate / 100) : 0;
  const variableRate = (commissionRate / 100) + serviceFeeRate + (adRate + campaignRate) / 100 + vatFactor;
  const fixedCost = productCost + packagingCost + extraFixedCost + shippingAmount;

  const totalExpense = round2(
    fixedCost +
      commissionAmount +
      marketingServiceFee +
      marketplaceServiceFee +
      adAmount +
      campaignDiscountAmount +
      vatAmount,
  );
  const netProfit = round2(salePrice - totalExpense);
  const profitMarginPercent =
    salePrice > 0 ? round2((netProfit / salePrice) * 100) : 0;

  let breakEvenPrice: number | null = null;
  let suggestedSalePrice: number | null = null;

  if (variableRate < 1) {
    breakEvenPrice = round2(fixedCost / (1 - variableRate));
    const marginTarget = Math.min(99, Math.max(0, targetMargin));
    const denom = 1 - variableRate - marginTarget / 100;
    if (denom > 0) {
      suggestedSalePrice = round2(fixedCost / denom);
    }
  }

  const shippingSource = shippingTable?.source ?? getShippingSourceMeta(input.marketplace as MarketplaceId);

  return {
    ready: salePrice > 0,
    errors,
    warnings,
    commissionRatePercent: commissionRate,
    commissionAmount,
    marketingServiceFee,
    marketplaceServiceFee,
    shippingAmount,
    vatAmount,
    adAmount,
    campaignDiscountAmount,
    packagingCost,
    productCost,
    extraFixedCost,
    totalExpense,
    netProfit,
    profitMarginPercent,
    breakEvenPrice,
    suggestedSalePrice,
    riskLabel: salePrice > 0 ? resolveRiskLabel(profitMarginPercent) : null,
    categoryLabel: category.name,
    carrierLabel: SHIPPING_CARRIER_LABELS[input.carrier as ShippingCarrierId] || input.carrier,
    commissionSource: commissionEntry.source,
    shippingSource,
    dataConfidence: commissionEntry.source.confidence,
  };
}

export function buildMarketplaceIntelligenceMeta() {
  return {
    version: "import_cache_v2",
    marketplaces: ["trendyol", "hepsiburada", "n11", "ciceksepeti"] as MarketplaceId[],
    shippingSource: "pdf_import",
    commissionSource: "pdf_import",
    categorySource: "ena_mapping",
    ciceksepetiCommissionAvailable: false,
  };
}
