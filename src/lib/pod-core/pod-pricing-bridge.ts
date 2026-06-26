import type { CalculatePricingInput, CalculatePricingResult, PricingCustomerType } from "@/lib/pricing-engine/pricing-types";
import { PRICING_UNAVAILABLE_MESSAGE } from "@/lib/pricing-engine/pricing-service";
import { enrichTemplateIdFromGraph, resolvePricingFromGraph } from "@/lib/product-engine/graph-resolvers";
import type { MockupTemplate, PodPricingSnapshot } from "./pod-types";

export type PodPricingBridgeRequest = {
  templateId: string;
  variantId?: string;
  pricingRuleCode: string;
  pricingCatalogId?: string;
  sizeVariantKey?: string;
  widthCm: number;
  heightCm: number;
  quantity: number;
  customerType: PricingCustomerType;
  optionCodes?: string[];
};

export type PodPricingBridgeResponse = {
  pricing: PodPricingSnapshot;
  raw: CalculatePricingResult;
};

export function isPricingBridgeReady(): boolean {
  return true;
}

export function buildPricingBridgePayload(
  template: MockupTemplate,
  widthCm: number,
  heightCm: number,
  quantity: number,
  customerType: PricingCustomerType = "RETAIL"
): PodPricingBridgeRequest {
  const fromGraph = enrichTemplateIdFromGraph(template.id);
  return {
    templateId: template.id,
    variantId: template.variantId,
    pricingRuleCode: fromGraph?.pricingRuleCode ?? template.pricingRuleCode,
    pricingCatalogId: fromGraph?.pricingCatalogId ?? template.pricingCatalogId,
    widthCm: Math.max(1, widthCm),
    heightCm: Math.max(1, heightCm),
    quantity: Math.max(1, quantity),
    customerType,
  };
}

/** Resolve pricing fields from Product Graph when templateId or productCode known */
export function resolvePricingBridgeFromGraph(input: {
  templateId?: string;
  productCode?: string;
}): Pick<PodPricingBridgeRequest, "pricingRuleCode" | "pricingCatalogId" | "templateId"> | null {
  const pricing = resolvePricingFromGraph({
    templateId: input.templateId,
    productCode: input.productCode,
  });
  if (!pricing) return null;
  return {
    templateId: input.templateId ?? pricing.productCode,
    pricingRuleCode: pricing.pricingRuleCode,
    pricingCatalogId: pricing.pricingCatalogId || undefined,
  };
}

export function toCalculatePricingInput(req: PodPricingBridgeRequest): CalculatePricingInput {
  const input: CalculatePricingInput = {
    ruleCode: req.pricingRuleCode,
    catalogId: req.pricingCatalogId,
    sizeVariantKey: req.sizeVariantKey,
    quantity: req.quantity,
    customerType: req.customerType,
    sourceType: "POD_CORE",
    sourceReferenceId: req.templateId,
    writeLog: false,
    optionCodes: req.optionCodes,
  };
  if (req.widthCm > 0) input.widthCm = req.widthCm;
  if (req.heightCm > 0) input.heightCm = req.heightCm;
  const variantCodes = [...(req.variantId ? [req.variantId] : [])];
  if (req.sizeVariantKey && !variantCodes.includes(req.sizeVariantKey)) {
    variantCodes.push(req.sizeVariantKey);
  }
  if (variantCodes.length) input.variantCodes = variantCodes;
  return input;
}

export function mapPricingResult(
  result: CalculatePricingResult,
  calculationTimeMs: number
): PodPricingSnapshot {
  return {
    areaM2: result.areaM2,
    ruleCode: result.ruleCode,
    retailPrice: result.retailPrice,
    dealerPrice: result.dealerPrice,
    finalPrice: result.finalPrice,
    materialCost: result.materialCost,
    laborCost: result.laborCost,
    printCost: result.printCost,
    wasteCost: result.wasteCost,
    commissionAmount: result.commissionAmount,
    taxAmount: result.taxAmount,
    currency: result.currency,
    breakdown: result.breakdown,
    calculationTimeMs,
  };
}

/** Client-side — POST /api/pod/calculate-price */
export async function fetchPodPricing(
  req: PodPricingBridgeRequest
): Promise<PodPricingBridgeResponse> {
  const res = await fetch("/api/pod/calculate-price", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: CalculatePricingResult;
    meta?: { calculationTimeMs?: number };
  };
  if (!res.ok || !json.success || !json.data) {
    const raw = json.error || "Fiyat hesaplanamadı";
    const friendly =
      raw.includes("Fiyat kuralı bulunamadı") || raw.includes("CAM_CATALOG")
        ? PRICING_UNAVAILABLE_MESSAGE
        : raw;
    throw new Error(friendly);
  }
  const calculationTimeMs = json.meta?.calculationTimeMs ?? 0;
  return {
    pricing: mapPricingResult(json.data, calculationTimeMs),
    raw: json.data,
  };
}
