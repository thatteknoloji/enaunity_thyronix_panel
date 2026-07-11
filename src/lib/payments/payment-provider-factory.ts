import type { PaymentProvider, PaymentProviderKey } from "./payment-types";
import { createManualProvider } from "./manual-provider";
import { createEsnekposProvider } from "./esnekpos-provider";
import { createIyzicoProvider } from "./iyzico-provider";

export function createProviderByKey(key: PaymentProviderKey): PaymentProvider {
  switch (key) {
    case "ESNEKPOS":
      return createEsnekposProvider();
    case "IYZICO":
      return createIyzicoProvider();
    case "MANUAL":
      return createManualProvider();
    default:
      return createManualProvider();
  }
}

export function normalizeProviderParam(value: string): PaymentProviderKey | null {
  const upper = value.toUpperCase();
  if (["MANUAL", "IYZICO", "PAYTR", "ESNEKPOS", "STRIPE"].includes(upper)) {
    return upper as PaymentProviderKey;
  }
  return null;
}
