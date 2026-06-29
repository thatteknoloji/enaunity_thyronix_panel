/**
 * Bayi ödeme sorunu teşhisi
 * Run: npx tsx scripts/diagnose-dealer-payment.ts coskunogludekor@hotmail.com
 */
import { prisma } from "../src/lib/db";
import { resolveDealerPaymentMethods } from "../src/lib/payments/payment-method-policy";
import { getPaymentSettings } from "../src/lib/payments/payment-settings";
import { buildCheckoutPaymentContext } from "../src/lib/payments/checkout-payment-service";
import { canDealerPurchaseModule } from "../src/lib/modules/access";

const emailArg = process.argv[2]?.trim().toLowerCase();
if (!emailArg) {
  console.error("Usage: npx tsx scripts/diagnose-dealer-payment.ts <email>");
  process.exit(1);
}

async function findDealer(email: string) {
  const byDealerEmail = await prisma.dealer.findFirst({
    where: { email: { equals: email } },
  });
  if (byDealerEmail) return byDealerEmail;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email } },
  });
  if (user?.dealerId) {
    return prisma.dealer.findUnique({ where: { id: user.dealerId } });
  }
  return null;
}

function printSection(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  printSection("ARAMA");
  console.log("Email:", emailArg);

  const dealer = await findDealer(emailArg);
  if (!dealer) {
    console.log("❌ Bayi bulunamadı. Dealer.email veya User.email ile eşleşen kayıt yok.");
    const partial = await prisma.dealer.findMany({
      where: {
        OR: [
          { email: { contains: emailArg.split("@")[0] } },
          { name: { contains: emailArg.split("@")[0] } },
          { company: { contains: emailArg.split("@")[0] } },
        ],
      },
      take: 5,
      select: { id: true, email: true, name: true, company: true },
    });
    if (partial.length) console.log("Benzer bayiler:", partial);
    return;
  }

  printSection("BAYİ");
  console.log({
    id: dealer.id,
    name: dealer.name,
    company: dealer.company,
    email: dealer.email,
    status: dealer.status,
    group: dealer.group,
    balance: dealer.balance,
    creditLimit: dealer.creditLimit,
  });

  const approval = await prisma.dealerApproval.findUnique({ where: { dealerId: dealer.id } });
  printSection("BAYİ ONAYI");
  console.log(approval || "Kayıt yok (modül satın alma engellenebilir)");

  const canPurchase = await canDealerPurchaseModule(dealer.id);
  console.log("Modül satın alma:", canPurchase ? "✓ izinli" : "✗ DealerApproval ACTIVE değil");

  printSection("ÖDEME POLİTİKALARI");
  const policies = await prisma.paymentMethodPolicy.findMany({
    where: {
      OR: [
        { scope: "GLOBAL", scopeKey: "" },
        { scope: "GROUP", scopeKey: dealer.group },
        { scope: "DEALER", scopeKey: dealer.id },
      ],
    },
  });
  if (!policies.length) {
    console.log("Özel politika yok — gateway varsayılanları geçerli");
  } else {
    for (const p of policies) {
      console.log({
        scope: p.scope,
        scopeKey: p.scopeKey || "(global)",
        cardEnabled: p.cardEnabled,
        bankTransferEnabled: p.bankTransferEnabled,
        balanceEnabled: p.balanceEnabled,
      });
    }
  }

  printSection("ÇÖZÜMLENEN ÖDEME YÖNTEMLERİ");
  const resolved = await resolveDealerPaymentMethods(dealer.id);
  console.log(resolved);

  const ctx = await buildCheckoutPaymentContext({
    dealerId: dealer.id,
    cartTotal: 1000,
    balanceEnabled: resolved.balanceEnabled,
  });
  console.log("Checkout modları (1000 TL sepet):", ctx.methods);

  printSection("GATEWAY AYARLARI");
  const settings = await getPaymentSettings();
  console.log({
    activeCardProvider: settings.activeCardProvider,
    bankTransferEnabled: settings.bankTransferEnabled,
    esnekpos: {
      enabled: settings.esnekpos.enabled,
      configured: settings.esnekpos.configured,
      sandbox: settings.esnekpos.sandbox,
    },
    iyzico: {
      enabled: settings.iyzico.enabled,
      configured: settings.iyzico.configured,
      sandbox: settings.iyzico.sandbox,
    },
  });

  printSection("SON ÖDEMELER");
  const payments = await prisma.modulePayment.findMany({
    where: { dealerId: dealer.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      moduleKey: true,
      planKey: true,
      amount: true,
      status: true,
      provider: true,
      createdAt: true,
    },
  });
  console.log(payments.length ? payments : "Ödeme kaydı yok");

  printSection("TEŞHİS ÖZETİ");
  const issues: string[] = [];
  if ((dealer.status || "").toLowerCase() !== "active") {
    issues.push(`Bayi durumu "${dealer.status}" — active olmalı`);
  }
  if (!canPurchase) {
    issues.push("DealerApproval ACTIVE değil — Admin → Bayi Onayları");
  }
  if (!resolved.cardEnabled || !resolved.methods.some((m) => m === "ESNEKPOS" || m === "IYZICO")) {
    issues.push("Kart ödemesi kapalı — Admin → Ödeme Politikaları veya Gateway ayarları");
  }
  if (settings.activeCardProvider === "NONE" || !settings.esnekpos.configured) {
    issues.push("EsnekPOS yapılandırılmamış — Admin → Ödeme Altyapısı veya env ESNEKPOS_*");
  }
  if (policies.some((p) => p.cardEnabled === false && (p.scope === "DEALER" || p.scope === "GROUP"))) {
    issues.push("cardEnabled=false politikası var — kart ödemesi engellenmiş olabilir");
  }

  if (issues.length) {
    console.log("Tespit edilen sorunlar:");
    issues.forEach((i) => console.log(" •", i));
  } else {
    console.log("ENAunity tarafında engel görünmüyor.");
    console.log(
      '"Bayinin ödeme yetkisi yoktur" hatası EsnekPOS RETURN_CODE 100 — üye işyeri servis yetkisi.',
    );
    console.log("EsnekPOS panelinde Ortak Ödeme Sayfası yetkisini açın veya destek@esnekpos.com.");
  }

  printSection("HIZLI DÜZELTME (production DB)");
  console.log(`-- Kart politikasını bayi için aç:
INSERT INTO PaymentMethodPolicy (id, scope, scopeKey, cardEnabled, bankTransferEnabled, balanceEnabled, updatedBy, createdAt, updatedAt)
VALUES (lower(hex(randomblob(16))), 'DEALER', '${dealer.id}', 1, NULL, NULL, 'script', datetime('now'), datetime('now'))
ON CONFLICT(scope, scopeKey) DO UPDATE SET cardEnabled=1, updatedAt=datetime('now');`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
