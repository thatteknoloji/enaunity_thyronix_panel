/**
 * EsnekPOS canlı credential testi
 * Run: npx tsx scripts/test-esnekpos-live.ts
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const MERCHANT = process.env.ESNEKPOS_MERCHANT_ID || process.env.ESNEKPOS_PUBLIC_TOKEN || "";
const MERCHANT_KEY = process.env.ESNEKPOS_SECRET || process.env.ESNEKPOS_MERCHANT_KEY || "";
const API_URL = process.env.ESNEKPOS_API_URL || "https://posservice.esnekpos.com";
const BACK_URL = process.env.ESNEKPOS_BACK_URL || "https://enaunity.com.tr/api/payments/callback/esnekpos";

async function main() {
  console.log("=== EsnekPOS Canlı Test ===\n");
  console.log("Merchant ID:", MERCHANT ? `${MERCHANT}` : "(boş)");
  console.log("Merchant Key:", MERCHANT_KEY ? `set (${MERCHANT_KEY.length} char)` : "(boş)");
  console.log("API URL:", API_URL);
  console.log("BACK URL:", BACK_URL);

  if (!MERCHANT || !MERCHANT_KEY) {
    console.error("\n❌ ESNEKPOS_MERCHANT_ID ve ESNEKPOS_SECRET gerekli");
    process.exit(1);
  }

  const orderRef = `TEST${Date.now()}`.slice(0, 24);
  const body = {
    Config: {
      MERCHANT: MERCHANT,
      MERCHANT_KEY: MERCHANT_KEY,
      ORDER_REF_NUMBER: orderRef,
      ORDER_AMOUNT: "10.00",
      PRICES_CURRENCY: "TRY",
      BACK_URL: `${BACK_URL}?paymentId=test-live-${orderRef}`,
      LOCALE: "tr",
    },
    Customer: {
      FIRST_NAME: "Test",
      LAST_NAME: "Bayi",
      MAIL: "test@enaunity.com.tr",
      PHONE: "5550000000",
      CITY: "Istanbul",
      STATE: "Kadikoy",
      ADDRESS: "Turkiye",
    },
    Product: [
      {
        PRODUCT_ID: "test1",
        PRODUCT_NAME: "ENAUNITY Test Odeme",
        PRODUCT_CATEGORY: "Dijital Urun",
        PRODUCT_DESCRIPTION: "Credential test",
        PRODUCT_AMOUNT: "10.00",
      },
    ],
  };

  console.log("\n→ POST /api/pay/CommonPaymentDealer ...");
  const res = await fetch(`${API_URL}/api/pay/CommonPaymentDealer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.log("Raw response:", text.slice(0, 500));
    process.exit(1);
  }

  console.log("\nYanıt:");
  console.log(JSON.stringify(data, null, 2));

  const status = String(data.STATUS || "");
  const returnCode = String(data.RETURN_CODE ?? "");
  const msg = String(data.RETURN_MESSAGE_TR || data.RETURN_MESSAGE || "");

  if (status === "SUCCESS" && returnCode === "0" && data.URL_3DS) {
    console.log("\n✓ EsnekPOS bağlantısı BAŞARILI — 3DS URL alındı");
    console.log("URL_3DS:", String(data.URL_3DS).slice(0, 80) + "...");
    return;
  }

  console.log("\n❌ EsnekPOS ödeme başlatılamadı");
  console.log("RETURN_CODE:", returnCode);
  console.log("Mesaj:", msg);

  if (returnCode === "100" || /yetkisi|yetki/i.test(msg)) {
    console.log("\n→ EsnekPOS panelinde Ortak Ödeme Sayfası servis yetkisi kapalı.");
    console.log("  destek@esnekpos.com — Merchant: enaunity.com.tr");
  }
  if (returnCode === "102") {
    if (/IP adresinden/i.test(msg)) {
      console.log("\n→ Kimlik bilgileri DOĞRU; EsnekPOS IP kısıtı var.");
      console.log("  Production sunucu IP'sini EsnekPOS panelinde whitelist'e ekleyin.");
    } else {
      console.log("\n→ Kimlik doğrulama hatası — MERCHANT paneldeki domain olmalı (enaunity.com.tr/), Public Token değil.");
    }
  }
  if (returnCode === "104") {
    console.log("\n→ Komisyon tanımları eksik — EsnekPOS panelinden komisyon ayarlayın.");
  }

  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
