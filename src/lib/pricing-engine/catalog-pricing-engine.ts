import type { CalculatePricingInput, CalculatePricingResult } from "./pricing-types";
import { lookupCatalogPrice } from "./pod-price-catalog";

export function tryCalculateFromCatalog(input: CalculatePricingInput): CalculatePricingResult | null {
  const hit = lookupCatalogPrice({
    ruleCode: input.ruleCode,
    catalogId: input.catalogId,
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    quantity: input.quantity,
    variantCodes: input.variantCodes,
    sizeVariantKey: input.sizeVariantKey,
    optionCodes: input.optionCodes,
    customerType: input.customerType,
  });

  if (!hit) return null;

  const breakdown = [
    { key: "catalog", label: `Katalog: ${hit.catalogName}`, amount: hit.salePrice },
    { key: "matchType", label: `Eşleşme: ${hit.matchType}`, amount: 0 },
    { key: "sizeLabel", label: hit.sizeLabel, amount: 0 },
  ];

  if (hit.optionSurcharge > 0) {
    breakdown.push({ key: "option:POST_KESIM", label: "Post kesim", amount: hit.optionSurcharge });
  }

  breakdown.push(
    { key: "retailPrice", label: "Perakende", amount: hit.retailPrice },
    { key: "dealerPrice", label: "Bayi", amount: hit.dealerPrice },
    { key: "finalPrice", label: "Son fiyat", amount: hit.finalPrice }
  );

  return {
    areaM2: hit.areaM2,
    baseCost: hit.basePrice,
    materialCost: 0,
    laborCost: 0,
    printCost: 0,
    cuttingCost: 0,
    packagingCost: 0,
    shippingCost: 0,
    wasteCost: 0,
    variantAdjustment: 0,
    optionAdjustment: hit.optionSurcharge,
    subtotalCost: hit.salePrice,
    commissionAmount: 0,
    profitAmount: 0,
    taxAmount: 0,
    retailPrice: hit.retailPrice,
    dealerPrice: hit.dealerPrice,
    finalPrice: hit.finalPrice,
    currency: hit.currency,
    breakdown,
    ruleId: `catalog:${hit.catalogId}`,
    ruleCode: input.ruleCode,
    ruleVersion: 1,
  };
}
