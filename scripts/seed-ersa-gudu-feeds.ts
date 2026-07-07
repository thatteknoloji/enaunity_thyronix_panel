/**
 * Ersa Güdü (esraguden840@gmail.com) — 18 feed paketini ekler ve isteğe bağlı senkronize eder.
 * Run: npx tsx scripts/seed-ersa-gudu-feeds.ts
 * Sync: npx tsx scripts/seed-ersa-gudu-feeds.ts --sync
 */
import { prisma } from "../src/lib/db";
import { seedErsaGuduPackage } from "../src/lib/thyronix/connectors/vht-seed-service";
import { ERSA_GUDU_VHT_CODES, loadErsaGuduFeedUrlMap } from "../src/lib/thyronix/connectors/vht-supplier-feeds";

async function main() {
  const doSync = process.argv.includes("--sync");
  const urlMap = loadErsaGuduFeedUrlMap();
  const missing = ERSA_GUDU_VHT_CODES.filter((c) => !urlMap[c]);

  console.log("=== Ersa Güdü Feed Paketi (18) ===\n");
  console.log(`URL yapılandırılmış: ${ERSA_GUDU_VHT_CODES.length - missing.length}/${ERSA_GUDU_VHT_CODES.length}`);
  if (missing.length) {
    console.log(`Eksik URL: ${missing.join(", ")}`);
    console.log("scripts/data/ersa-gudu-feeds.json dosyasını kontrol edin.\n");
    process.exit(1);
  }

  const data = await seedErsaGuduPackage({ sync: doSync });
  console.log(`Hedef bayi: ${data.dealerId}`);
  console.log(`Kaynak sayısı: ${data.uniqueSources} (VHT38+39 birleşik)`);
  console.log(`Sonuç: ${data.configuredResults}/18 feed işlendi\n`);

  for (const r of data.results) {
    if (r.error) {
      console.log(`✗ ${r.code}: ${r.error}`);
    } else {
      console.log(`✓ ${r.code}${r.count != null ? ` — ${r.count} ürün` : ""}`);
    }
  }

  console.log("\nPanel: /thyronix/sources · /thyronix/products");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
