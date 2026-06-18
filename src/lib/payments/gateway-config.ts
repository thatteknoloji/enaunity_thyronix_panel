import type { PaymentProviderKey } from "./payment-types";

export type ProductLibraryPaymentMethod = "BANK_TRANSFER" | "ESNEKPOS" | "IYZICO";

export function isEsnekposEnabled(): boolean {
  return process.env.ESNEKPOS_ENABLED === "true";
}

export function isIyzicoEnabled(): boolean {
  return process.env.IYZICO_ENABLED === "true";
}

export function getEsnekposConfig() {
  const sandbox = process.env.ESNEKPOS_SANDBOX === "true";
  return {
    enabled: isEsnekposEnabled(),
    merchantId: process.env.ESNEKPOS_MERCHANT_ID || process.env.ESNEKPOS_PUBLIC_TOKEN || "",
    merchantKey: process.env.ESNEKPOS_SECRET || process.env.ESNEKPOS_MERCHANT_KEY || "",
    backUrl: process.env.ESNEKPOS_BACK_URL || "",
    apiUrl:
      process.env.ESNEKPOS_API_URL ||
      (sandbox ? "https://posservicetest.esnekpos.com" : "https://posservice.esnekpos.com"),
    sandbox,
  };
}

export function getIyzicoConfig() {
  const sandbox = process.env.IYZICO_SANDBOX !== "false";
  return {
    enabled: isIyzicoEnabled(),
    apiKey: process.env.IYZICO_API_KEY || "",
    secretKey: process.env.IYZICO_SECRET_KEY || "",
    baseUrl:
      process.env.IYZICO_BASE_URL ||
      (sandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com"),
    sandbox,
  };
}

export function getSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3333"
  );
}

export function getAvailablePaymentMethods(): ProductLibraryPaymentMethod[] {
  const methods: ProductLibraryPaymentMethod[] = ["BANK_TRANSFER"];
  if (isEsnekposEnabled()) methods.push("ESNEKPOS");
  if (isIyzicoEnabled()) methods.push("IYZICO");
  return methods;
}

export function resolveProviderKey(method: ProductLibraryPaymentMethod): PaymentProviderKey {
  switch (method) {
    case "ESNEKPOS":
      return "ESNEKPOS";
    case "IYZICO":
      return "IYZICO";
    default:
      return "MANUAL";
  }
}

export function providerConfigured(key: PaymentProviderKey): boolean {
  switch (key) {
    case "ESNEKPOS": {
      const c = getEsnekposConfig();
      return c.enabled && Boolean(c.merchantId && c.merchantKey);
    }
    case "IYZICO": {
      const c = getIyzicoConfig();
      return c.enabled && Boolean(c.apiKey && c.secretKey);
    }
    case "MANUAL":
      return true;
    default:
      return false;
  }
}
