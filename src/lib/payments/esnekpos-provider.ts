import {
  PaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  VerifyPaymentParams,
  WebhookPayload,
} from "./payment-types";
import { getEsnekposConfig, getSiteBaseUrl, providerConfigured } from "./gateway-config";

function toOrderRef(paymentId: string): string {
  return paymentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
}

export { toOrderRef as esnekposOrderRef };

function buildCallbackUrl(baseUrl: string, paymentId: string) {
  const url = baseUrl.startsWith("http") ? new URL(baseUrl) : new URL(baseUrl, getSiteBaseUrl());
  url.searchParams.set("paymentId", paymentId);
  return url.toString();
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] || "Bayi", lastName: "Kullanici" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

async function esnekposRequest(path: string, body: Record<string, unknown>) {
  const config = await getEsnekposConfig();
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { STATUS: "FAILED", RETURN_MESSAGE: text || "EsnekPOS yanıt hatası" };
  }
}

export function createEsnekposProvider(): PaymentProvider {
  return {
    key: "ESNEKPOS",

    async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
      const config = await getEsnekposConfig();
      const paymentId = params.metadata?.paymentId || "";
      const orderRef = toOrderRef(paymentId);
      const baseBack =
        config.backUrl ||
        `${getSiteBaseUrl()}/api/payments/callback/esnekpos`;
      const callbackUrl = buildCallbackUrl(baseBack, paymentId);

      if (!(await providerConfigured("ESNEKPOS"))) {
        const redirectUrl = `${callbackUrl}&status=success&sandbox=1`;
        return {
          success: true,
          paymentId,
          providerReference: orderRef,
          redirectUrl,
          status: "WAITING_PAYMENT",
          message: "EsnekPOS sandbox ödeme sayfasına yönlendiriliyorsunuz.",
        };
      }

      const buyer = params.metadata?.buyer || {};
      const fullName = String(buyer.name || "Bayi Kullanici");
      const { firstName, lastName } = splitName(fullName);

      const body = {
        Config: {
          MERCHANT: config.merchantId,
          MERCHANT_KEY: config.merchantKey,
          ORDER_REF_NUMBER: orderRef,
          ORDER_AMOUNT: params.amount.toFixed(2),
          PRICES_CURRENCY: params.currency || "TRY",
          BACK_URL: callbackUrl,
          LOCALE: "tr",
        },
        Customer: {
          FIRST_NAME: firstName,
          LAST_NAME: lastName,
          MAIL: String(buyer.email || "dealer@enaunity.com.tr"),
          PHONE: String(buyer.phone || "5550000000"),
          CITY: "Istanbul",
          STATE: "Kadikoy",
          ADDRESS: "Turkiye",
        },
        Product: [
          {
            PRODUCT_ID: params.planKey.slice(0, 24),
            PRODUCT_NAME: `${params.moduleKey} — ${params.planKey}`.slice(0, 100),
            PRODUCT_CATEGORY: "Dijital Urun",
            PRODUCT_DESCRIPTION: "ENAUNITY modul odemesi",
            PRODUCT_AMOUNT: params.amount.toFixed(2),
          },
        ],
      };

      try {
        const data = await esnekposRequest("/api/pay/CommonPaymentDealer", body);
        const status = String(data.STATUS || "");
        const returnCode = String(data.RETURN_CODE ?? "");
        const redirectUrl = String(data.URL_3DS || "");

        if (status !== "SUCCESS" || returnCode !== "0" || !redirectUrl) {
          return {
            success: false,
            status: "FAILED",
            message: String(data.RETURN_MESSAGE_TR || data.RETURN_MESSAGE || "EsnekPOS ödeme başlatılamadı"),
          };
        }

        return {
          success: true,
          paymentId,
          providerReference: String(data.REFNO || orderRef),
          redirectUrl,
          status: "WAITING_PAYMENT",
          message: "EsnekPOS ödeme sayfasına yönlendiriliyorsunuz.",
        };
      } catch (e) {
        return {
          success: false,
          status: "FAILED",
          message: e instanceof Error ? e.message : "EsnekPOS bağlantı hatası",
        };
      }
    },

    async verifyPayment(params: VerifyPaymentParams): Promise<PaymentResult> {
      const config = await getEsnekposConfig();
      if (!(await providerConfigured("ESNEKPOS"))) {
        return { success: true, status: "PAID", paymentId: params.paymentId, message: "Sandbox doğrulama başarılı" };
      }

      const orderRef = toOrderRef(params.paymentId);

      try {
        const data = await esnekposRequest("/api/services/ProcessQuery", {
          MERCHANT: config.merchantId,
          MERCHANT_KEY: config.merchantKey,
          ORDER_REF_NUMBER: orderRef,
        });

        const ok =
          String(data.STATUS || "") === "SUCCESS" &&
          String(data.RETURN_CODE ?? "") === "0";

        return {
          success: ok,
          paymentId: params.paymentId,
          providerReference: String(data.REFNO || params.providerReference),
          status: ok ? "PAID" : "FAILED",
          message: ok
            ? "EsnekPOS ödeme doğrulandı"
            : String(data.RETURN_MESSAGE || "EsnekPOS ödeme başarısız"),
        };
      } catch (e) {
        return {
          success: false,
          status: "FAILED",
          message: e instanceof Error ? e.message : "EsnekPOS doğrulama hatası",
        };
      }
    },

    async handleWebhook(payload: WebhookPayload): Promise<PaymentResult> {
      const ok =
        payload.status.toUpperCase() === "SUCCESS" &&
        String(payload.raw?.RETURN_CODE ?? "0") === "0";
      return {
        success: ok,
        providerReference: payload.providerReference,
        status: ok ? "PAID" : "FAILED",
        message: ok ? "EsnekPOS webhook başarılı" : "EsnekPOS webhook başarısız",
      };
    },

    async refundPayment(_paymentId: string): Promise<PaymentResult> {
      return { success: false, status: "FAILED", message: "EsnekPOS iade MVP dışında" };
    },
  };
}
