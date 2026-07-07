/**
 * Canlı öncesi Ersa Güdü paketi doğrulama.
 * Run: npx tsx scripts/verify-ersa-gudu-setup.ts
 * Run: npx tsx scripts/verify-ersa-gudu-setup.ts --db
 */
import { prisma } from "../src/lib/db";
import {
  ERSA_GUDU_VHT_CODES,
  ERSA_BEZOS_VHT_CODES,
  loadErsaGuduFeedUrlMap,
} from "../src/lib/thyronix/connectors/vht-supplier-feeds";
import { getBezosAllowedEmails } from "../src/lib/thyronix/connectors/bezos-bayi-access";

async function verifyDb() {
  const emails = getBezosAllowedEmails();
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, dealerId: true },
  });

  if (!users.length) {
    console.log("DB: Hedef kullanıcı bulunamadı —", emails.join(", "));
    return false;
  }

  let ok = true;
  for (const u of users) {
    if (!u.dealerId) {
      console.log(`DB: ${u.email} — dealerId yok`);
      ok = false;
      continue;
    }

    const sources = await prisma.thyronixSource.findMany({
      where: { dealerId: u.dealerId },
      select: { name: true, productCount: true, status: true, lastSync: true, fixedValues: true },
      orderBy: { name: "asc" },
    });

    const codes = sources.map((s) => {
      try {
        return JSON.parse(s.fixedValues || "{}")._supplierCode as string;
      } catch {
        return null;
      }
    }).filter(Boolean) as string[];

    const missing = ERSA_GUDU_VHT_CODES.filter((c) => {
      if (ERSA_BEZOS_VHT_CODES.includes(c as (typeof ERSA_BEZOS_VHT_CODES)[number])) {
        return !codes.includes("VHT38");
      }
      return !codes.includes(c);
    });

    const productTotal = await prisma.thyronixProduct.count({ where: { dealerId: u.dealerId } });

    console.log(`\nDB: ${u.email}`);
    console.log(`  Kaynak: ${sources.length} · Ürün: ${productTotal}`);
    console.log(`  Eksik VHT: ${missing.length ? missing.join(", ") : "yok"}`);

    for (const s of sources) {
      let code = "?";
      try {
        code = JSON.parse(s.fixedValues || "{}")._supplierCode || "?";
      } catch {
        /* ignore */
      }
      console.log(`  ${code.padEnd(6)} ${String(s.productCount).padStart(6)} ürün  ${s.status}  ${s.lastSync?.toISOString?.().slice(0, 19) || "—"}`);
    }

    if (missing.length) ok = false;
    if (productTotal === 0) ok = false;
  }

  return ok;
}

async function main() {
  const withDb = process.argv.includes("--db");
  const urlMap = loadErsaGuduFeedUrlMap();
  const missingUrls = ERSA_GUDU_VHT_CODES.filter((c) => !urlMap[c]);

  console.log("=== Ersa Güdü Canlı Öncesi Kontrol ===\n");
  console.log(`URL dosyası: ${ERSA_GUDU_VHT_CODES.length - missingUrls.length}/${ERSA_GUDU_VHT_CODES.length} feed`);
  if (missingUrls.length) {
    console.log(`  Eksik: ${missingUrls.join(", ")}`);
  } else {
    for (const code of ERSA_GUDU_VHT_CODES) {
      console.log(`  ✓ ${code}`);
    }
  }

  let allOk = missingUrls.length === 0;

  if (withDb) {
    const dbOk = await verifyDb();
    allOk = allOk && dbOk;
  } else {
    console.log("\nDB kontrolü atlandı (--db ile çalıştırın)");
  }

  console.log(allOk ? "\n✓ Hazır" : "\n✗ Eksikler var — düzeltmeden canlıya almayın");
  console.log("\nSıradaki adımlar:");
  console.log("  1. npm run test:ersa-feeds");
  console.log("  2. npm run seed:ersa-gudu -- --sync");
  console.log("  3. npx tsx scripts/verify-ersa-gudu-setup.ts --db");
  process.exit(allOk ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
