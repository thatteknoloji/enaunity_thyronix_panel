import { PaymentProvider, CreatePaymentParams, PaymentResult, VerifyPaymentParams, WebhookPayload } from "./payment-types";

export function createManualProvider(): PaymentProvider {
  return {
    key: "MANUAL",
    async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
      return {
        success: true,
        status: "WAITING_PAYMENT",
        message: "Manuel ödeme için havale/EFT bekleniyor. Dekont yükleyerek ödeme bildirimi yapabilirsiniz.",
      };
    },
    async verifyPayment(_params: VerifyPaymentParams): Promise<PaymentResult> {
      return { success: false, status: "FAILED", message: "Manuel ödemeler için admin onayı gerekir." };
    },
    async handleWebhook(_payload: WebhookPayload): Promise<PaymentResult> {
      return { success: false, status: "FAILED", message: "Manuel provider için webhook desteklenmez." };
    },
    async refundPayment(_paymentId: string): Promise<PaymentResult> {
      return { success: true, status: "REFUNDED", message: "Manuel iade kaydedildi." };
    },
  };
}
