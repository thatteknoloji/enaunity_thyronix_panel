import crypto from "node:crypto";
import {
  PaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  VerifyPaymentParams,
  WebhookPayload,
} from "./payment-types";
import { getIyzicoConfig, getSiteBaseUrl, providerConfigured } from "./gateway-config";

function iyzicoAuthHeader(apiKey: string, secretKey: string, body: string) {
  const randomKey = crypto.randomBytes(16).toString("hex");
  const payload = randomKey + body;
  const signature = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return `IYZWSv2 ${Buffer.from(authString).toString("base64")}`;
}

async function iyzicoRequest(path: string, body: Record<string, unknown>) {
  const config = getIyzicoConfig();
  const bodyStr = JSON.stringify(body);
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: iyzicoAuthHeader(config.apiKey, config.secretKey, bodyStr),
    },
    body: bodyStr,
  });
  return (await res.json()) as Record<string, unknown>;
}

export function createIyzicoProvider(): PaymentProvider {
  return {
    key: "IYZICO",

    async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
      const config = getIyzicoConfig();
      const paymentId = params.metadata?.paymentId || crypto.randomUUID();
      const callbackUrl = `${getSiteBaseUrl()}/api/payments/callback/iyzico?paymentId=${paymentId}`;

      if (!providerConfigured("IYZICO")) {
        const redirectUrl = `${callbackUrl}&token=sandbox-${paymentId}&status=success`;
        return {
          success: true,
          paymentId,
          providerReference: `sandbox-${paymentId}`,
          redirectUrl,
          status: "WAITING_PAYMENT",
          message: "İyzico sandbox ödeme sayfasına yönlendiriliyorsunuz.",
        };
      }

      const buyer = params.metadata?.buyer || {};
      const body = {
        locale: "tr",
        conversationId: paymentId,
        price: params.amount.toFixed(2),
        paidPrice: params.amount.toFixed(2),
        currency: params.currency || "TRY",
        basketId: paymentId,
        paymentGroup: "PRODUCT",
        callbackUrl,
        enabledInstallments: [1],
        buyer: {
          id: String(buyer.id || params.dealerId),
          name: String(buyer.name || "Bayi"),
          surname: String(buyer.surname || "Kullanıcı"),
          email: String(buyer.email || "dealer@enaunity.com"),
          identityNumber: "11111111111",
          registrationAddress: "Istanbul",
          city: "Istanbul",
          country: "Turkey",
        },
        shippingAddress: {
          contactName: String(buyer.name || "Bayi"),
          city: "Istanbul",
          country: "Turkey",
          address: "Istanbul",
        },
        billingAddress: {
          contactName: String(buyer.name || "Bayi"),
          city: "Istanbul",
          country: "Turkey",
          address: "Istanbul",
        },
        basketItems: [
          {
            id: params.planKey,
            name: `${params.moduleKey} — ${params.planKey}`,
            category1: "Module",
            itemType: "VIRTUAL",
            price: params.amount.toFixed(2),
          },
        ],
      };

      try {
        const data = await iyzicoRequest("/payment/iyzipos/checkoutform/initialize/auth/ecom", body);
        const redirectUrl = String(data.paymentPageUrl || "");
        const token = String(data.token || "");
        if (data.status !== "success" || !redirectUrl) {
          return {
            success: false,
            status: "FAILED",
            message: String(data.errorMessage || "İyzico ödeme başlatılamadı"),
          };
        }
        return {
          success: true,
          paymentId,
          providerReference: token,
          redirectUrl,
          status: "WAITING_PAYMENT",
          message: "İyzico ödeme sayfasına yönlendiriliyorsunuz.",
        };
      } catch (e) {
        return {
          success: false,
          status: "FAILED",
          message: e instanceof Error ? e.message : "İyzico bağlantı hatası",
        };
      }
    },

    async verifyPayment(params: VerifyPaymentParams): Promise<PaymentResult> {
      const config = getIyzicoConfig();
      if (!providerConfigured("IYZICO") || params.providerReference.startsWith("sandbox-")) {
        return { success: true, status: "PAID", paymentId: params.paymentId, message: "Sandbox doğrulama başarılı" };
      }

      try {
        const data = await iyzicoRequest("/payment/iyzipos/checkoutform/auth/ecom/detail", {
          locale: "tr",
          conversationId: params.paymentId,
          token: params.providerReference,
        });
        const ok = data.status === "success" && data.paymentStatus === "SUCCESS";
        return {
          success: ok,
          paymentId: params.paymentId,
          providerReference: params.providerReference,
          status: ok ? "PAID" : "FAILED",
          message: ok ? "İyzico ödeme doğrulandı" : String(data.errorMessage || "İyzico ödeme başarısız"),
        };
      } catch (e) {
        return {
          success: false,
          status: "FAILED",
          message: e instanceof Error ? e.message : "İyzico doğrulama hatası",
        };
      }
    },

    async handleWebhook(payload: WebhookPayload): Promise<PaymentResult> {
      const ok =
        payload.status.toLowerCase() === "success" ||
        payload.raw?.paymentStatus === "SUCCESS";
      return {
        success: ok,
        providerReference: payload.providerReference,
        status: ok ? "PAID" : "FAILED",
        message: ok ? "İyzico webhook başarılı" : "İyzico webhook başarısız",
      };
    },

    async refundPayment(_paymentId: string): Promise<PaymentResult> {
      return { success: false, status: "FAILED", message: "İyzico iade MVP dışında" };
    },
  };
}
