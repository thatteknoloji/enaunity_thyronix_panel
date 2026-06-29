import type { PaymentProviderKey } from "./payment-types";
import { getPaymentSettings, type CardProvider } from "./payment-settings";
import { resolveEsnekCredentials, resolveIyzicoCredentials } from "./credential-resolve";

export type ProductLibraryPaymentMethod = "BANK_TRANSFER" | "ESNEKPOS" | "IYZICO";

export async function isEsnekposEnabled(): Promise<boolean> {
  const s = await getPaymentSettings();
  return s.activeCardProvider === "ESNEKPOS" && s.esnekpos.enabled && s.esnekpos.configured;
}

export async function isIyzicoEnabled(): Promise<boolean> {
  const s = await getPaymentSettings();
  return s.activeCardProvider === "IYZICO" && s.iyzico.enabled && s.iyzico.configured;
}

export async function getEsnekposConfig() {
  const s = await getPaymentSettings();
  const row = await (await import("@/lib/db")).prisma.paymentGatewaySettings.findUnique({ where: { id: "default" } });
  const sandbox = s.esnekpos.sandbox;
  const { merchantId, merchantKey } = resolveEsnekCredentials(row ?? undefined);
  return {
    enabled: s.activeCardProvider === "ESNEKPOS" && s.esnekpos.enabled,
    merchantId,
    merchantKey,
    backUrl: process.env.ESNEKPOS_BACK_URL || `${getSiteBaseUrl()}/api/payments/callback/esnekpos`,
    apiUrl:
      process.env.ESNEKPOS_API_URL ||
      (sandbox ? "https://posservicetest.esnekpos.com" : "https://posservice.esnekpos.com"),
    sandbox,
    installmentsEnabled: s.esnekpos.installmentsEnabled,
    maxInstallments: s.esnekpos.maxInstallments,
  };
}

export async function getIyzicoConfig() {
  const s = await getPaymentSettings();
  const row = await (await import("@/lib/db")).prisma.paymentGatewaySettings.findUnique({ where: { id: "default" } });
  const sandbox = s.iyzico.sandbox;
  const { apiKey, secretKey } = resolveIyzicoCredentials(row ?? undefined);
  return {
    enabled: s.activeCardProvider === "IYZICO" && s.iyzico.enabled,
    apiKey,
    secretKey,
    baseUrl:
      process.env.IYZICO_BASE_URL ||
      (sandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com"),
    sandbox,
    installmentsEnabled: s.iyzico.installmentsEnabled,
    maxInstallments: s.iyzico.maxInstallments,
  };
}

export function getSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3333"
  );
}

export async function getAvailablePaymentMethods(): Promise<ProductLibraryPaymentMethod[]> {
  const { getAvailablePaymentMethodsAsync } = await import("./payment-settings");
  return getAvailablePaymentMethodsAsync();
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

export async function providerConfigured(key: PaymentProviderKey): Promise<boolean> {
  const { isProviderOperational } = await import("./payment-settings");
  return isProviderOperational(key);
}

/** Sync legacy — env only fallback for tests */
export function isEsnekposEnabledSync(): boolean {
  return process.env.ESNEKPOS_ENABLED === "true";
}
export function isIyzicoEnabledSync(): boolean {
  return process.env.IYZICO_ENABLED === "true";
}
export function getAvailablePaymentMethodsSync(): ProductLibraryPaymentMethod[] {
  const methods: ProductLibraryPaymentMethod[] = ["BANK_TRANSFER"];
  if (isEsnekposEnabledSync()) methods.push("ESNEKPOS");
  if (isIyzicoEnabledSync()) methods.push("IYZICO");
  return methods;
}

export async function getActiveCardProvider(): Promise<CardProvider> {
  const s = await getPaymentSettings();
  return s.activeCardProvider;
}
