export type PaymentProviderKey = "MANUAL" | "IYZICO" | "PAYTR" | "ESNEKPOS" | "STRIPE";

export type PaymentIntentStatus = "CREATED" | "WAITING_PAYMENT" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED" | "MANUAL_REVIEW";

export type PaymentType = "CARD" | "BANK_TRANSFER" | "MANUAL" | "FREE_TRIAL";

export interface CreatePaymentParams {
  dealerId: string;
  moduleKey: string;
  planKey: string;
  amount: number;
  currency: string;
  paymentType: PaymentType;
  providerKey?: PaymentProviderKey;
  metadata?: {
    paymentId?: string;
    packageId?: string;
    orderId?: string;
    installmentCount?: number;
    buyer?: { id?: string; name?: string; surname?: string; email?: string; phone?: string };
  };
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  providerReference?: string;
  redirectUrl?: string;
  status: PaymentIntentStatus;
  message: string;
}

export interface VerifyPaymentParams {
  paymentId: string;
  providerReference: string;
}

export interface WebhookPayload {
  eventType: string;
  providerReference: string;
  status: string;
  raw: any;
}

export interface PaymentProvider {
  key: PaymentProviderKey;
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentResult>;
  handleWebhook(payload: WebhookPayload): Promise<PaymentResult>;
  refundPayment(paymentId: string): Promise<PaymentResult>;
}

export function getActivePaymentProvider(): PaymentProviderKey {
  return (process.env.PAYMENT_PROVIDER as PaymentProviderKey) || "MANUAL";
}
