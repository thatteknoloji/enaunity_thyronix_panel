/**
 * EsnekPOS credential + tüm ödeme yöntemlerini yapılandır
 * Run: npx tsx scripts/configure-esnekpos-and-open-payments.ts
 *
 * Env: ESNEKPOS_MERCHANT_ID, ESNEKPOS_SECRET (veya argüman)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { prisma } from "../src/lib/db";
import { ensureAllPaymentsOpen } from "../src/lib/payments/payment-method-policy";
import { savePaymentSettings, invalidatePaymentSettingsCache, getPaymentSettings } from "../src/lib/payments/payment-settings";
import { updateBalanceTopUpSettings } from "../src/lib/payments/balance-topup-settings";
import { resolveDealerPaymentMethods } from "../src/lib/payments/payment-method-policy";

const merchantId = process.argv[2] || process.env.ESNEKPOS_MERCHANT_ID || process.env.ESNEKPOS_PUBLIC_TOKEN || "";
const merchantKey = process.argv[3] || process.env.ESNEKPOS_SECRET || process.env.ESNEKPOS_MERCHANT_KEY || "";

async function testEsnekpos(): Promise<{ ok: boolean; code: string; message: string }> {
  const apiUrl = process.env.ESNEKPOS_API_URL || "https://posservice.esnekpos.com";
  const backUrl = process.env.ESNEKPOS_BACK_URL || "https://enaunity.com.tr/api/payments/callback/esnekpos";
  const orderRef = `CFG${Date.now()}`.slice(0, 24);

  const res = await fetch(`${apiUrl}/api/pay/CommonPaymentDealer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Config: {
        MERCHANT: merchantId,
        MERCHANT_KEY: merchantKey,
        ORDER_REF_NUMBER: orderRef,
        ORDER_AMOUNT: "10.00",
        PRICES_CURRENCY: "TRY",
        BACK_URL: `${backUrl}?paymentId=test-${orderRef}`,
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
          PRODUCT_ID: "1",
          PRODUCT_NAME: "ENAUNITY Config Test",
          PRODUCT_CATEGORY: "Dijital",
          PRODUCT_DESCRIPTION: "Test",
          PRODUCT_AMOUNT: "10.00",
        },
      ],
    }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  const code = String(data.RETURN_CODE ?? "");
  const message = String(data.RETURN_MESSAGE_TR || data.RETURN_MESSAGE || "");
  const ok = String(data.STATUS) === "SUCCESS" && code === "0" && Boolean(data.URL_3DS);
  return { ok, code, message };
}

async function main() {
  if (!merchantId || !merchantKey) {
    console.error("Merchant ID ve Key gerekli (.env.local veya argüman)");
    process.exit(1);
  }

  console.log("=== EsnekPOS + Ödeme Yapılandırması ===\n");
  console.log("Merchant ID:", merchantId);
  console.log("Merchant Key:", `${merchantKey.slice(0, 6)}... (${merchantKey.length} char)\n`);

  // 1. DB gateway ayarları
  await savePaymentSettings({
    bankTransferEnabled: true,
    activeCardProvider: "ESNEKPOS",
    esnekposEnabled: true,
    esnekposSandbox: process.env.ESNEKPOS_SANDBOX === "true",
    esnekposMerchantId: merchantId,
    esnekposMerchantKey: merchantKey,
    esnekposDisplayName: "Kredi Kartı",
  });
  invalidatePaymentSettingsCache();
  console.log("✓ PaymentGatewaySettings kaydedildi (EsnekPOS aktif)");

  // 2. Tüm bayiler için politika aç
  const policyResult = await ensureAllPaymentsOpen("configure-esnekpos-script");
  console.log("✓ Ödeme politikaları:", policyResult);

  // 3. Bakiye ayarları
  await updateBalanceTopUpSettings({
    enabled: true,
    splitEnabled: true,
    bankTransferEnabled: true,
  });
  console.log("✓ Bakiye / bölünmüş ödeme açık");

  // 4. Çözümlenen yöntemler
  const settings = await getPaymentSettings();
  console.log("\nGateway durumu:", {
    activeCardProvider: settings.activeCardProvider,
    esnekposConfigured: settings.esnekpos.configured,
    esnekposEnabled: settings.esnekpos.enabled,
    esnekposSandbox: settings.esnekpos.sandbox,
  });

  const sampleDealer = await prisma.dealer.findFirst({ select: { id: true, email: true, company: true } });
  if (sampleDealer) {
    const methods = await resolveDealerPaymentMethods(sampleDealer.id);
    console.log(`Örnek bayi (${sampleDealer.company || sampleDealer.email}):`, methods);
  }

  const coskun = await prisma.dealer.findFirst({
    where: {
      OR: [
        { email: { contains: "coskunoglu" } },
        { company: { contains: "coskun" } },
      ],
    },
  });
  if (coskun) {
    const m = await resolveDealerPaymentMethods(coskun.id);
    console.log(`Coskun bayi (${coskun.email}):`, m);
  } else {
    console.log("Coskun bayi bu DB'de yok (production'da çalıştırın)");
  }

  // 5. Canlı API testi
  console.log("\n→ EsnekPOS canlı API testi...");
  try {
    const test = await testEsnekpos();
    if (test.ok) {
      console.log("✓ EsnekPOS API BAŞARILI — kart ödemesi çalışır");
    } else {
      console.log(`⚠ EsnekPOS API yanıt: RETURN_CODE=${test.code} — ${test.message}`);
      if (test.code === "102") {
        if (/IP adresinden/i.test(test.message)) {
          console.log("  → Kimlik bilgileri DOĞRU; EsnekPOS IP kısıtı var. Production sunucu IP'sini whitelist'e ekleyin.");
        } else {
          console.log("  → MERCHANT paneldeki domain olmalı (enaunity.com.tr/), Public Token değil. Key'i yeniden kopyalayın.");
        }
      } else if (test.code === "100") {
        console.log("  → Kimlik OK ama servis yetkisi yok. EsnekPOS: Ortak Ödeme Sayfası yetkisi açtırın.");
      } else if (test.code === "104") {
        console.log("  → Komisyon tanımları eksik. EsnekPOS panelinden komisyon ayarlayın.");
      }
    }
  } catch (e) {
    console.log("⚠ API testi yapılamadı:", e instanceof Error ? e.message : e);
  }

  console.log("\n=== Tamamlandı ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
