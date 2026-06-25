/** Faz 2 — Pricing Engine V1 bağlantısı */
export type PodPricingBridgeInput = {
  ruleCode: string;
  widthCm?: number;
  heightCm?: number;
  quantity?: number;
  variantCodes?: string[];
  optionCodes?: string[];
};

export function buildPricingBridgePayload(): PodPricingBridgeInput {
  throw new Error("ENA_POD_CORE: pod-pricing-bridge V2 fazında aktif olacak");
}

export function isPricingBridgeReady(): boolean {
  return false;
}
