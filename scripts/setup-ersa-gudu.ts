/**
 * Ersa Güdü tam kurulum: kurallar + feed seed (+ isteğe bağlı sync).
 * Run: npx tsx scripts/setup-ersa-gudu.ts
 * Sync: npx tsx scripts/setup-ersa-gudu.ts --sync
 * Publish: npx tsx scripts/setup-ersa-gudu.ts --publish
 */
import { prisma } from "../src/lib/db";
import { seedErsaGuduPackage } from "../src/lib/thyronix/connectors/vht-seed-service";
import { resolveVhtTargetDealerId } from "../src/lib/thyronix/connectors/vht-seed-service";
import { provisionAndPublishOutputs, seedRules } from "./setup-ersa-gudu-helpers";

async function main() {
  const doSync = process.argv.includes("--sync");
  const publishOnly = process.argv.includes("--publish");
  const dealerId = await resolveVhtTargetDealerId();
  if (!dealerId) {
    console.error("✗ Hedef bayi yok — production DB'de esraguden840@gmail.com veya BEZOS_BAYI_TARGET_DEALER_ID gerekli");
    process.exit(1);
  }

  if (publishOnly) {
    console.log("=== Çıktı XML (kurallar + cache) ===");
    await provisionAndPublishOutputs(dealerId);
    const products = await prisma.thyronixProduct.count({ where: { dealerId } });
    console.log(`Toplam ürün: ${products.toLocaleString("tr-TR")}`);
    process.exit(0);
  }

  console.log("=== 1/3 Kurallar ===");
  await seedRules(dealerId);
  console.log("✓ Genel kurallar uygulandı\n");

  console.log(`=== 2/3 Feed seed${doSync ? " + sync" : ""} ===`);
  const data = await seedErsaGuduPackage({ sync: doSync });
  const ok = data.results.filter((r) => r.id && !r.error);
  const fail = data.results.filter((r) => r.error);

  for (const r of data.results) {
    console.log(r.error ? `✗ ${r.code}: ${r.error}` : `✓ ${r.code}${r.count != null ? ` — ${r.count} ürün` : ""}`);
  }

  console.log(`\nÖzet: ${ok.length}/${data.totalFeeds} feed · ${data.uniqueSources} kaynak`);
  if (fail.length) {
    console.log(`Hatalı: ${fail.map((f) => f.code).join(", ")}`);
  }

  const products = await prisma.thyronixProduct.count({ where: { dealerId } });
  console.log(`Toplam ürün: ${products.toLocaleString("tr-TR")}`);

  if (doSync && products > 0) {
    console.log("\n=== 3/3 Çıktı XML (kurallar + cache) ===");
    await provisionAndPublishOutputs(dealerId);
  } else if (doSync) {
    console.log("\n⚠ Ürün yok — çıktı XML atlandı");
  }

  process.exit(fail.length && fail.every((f) => f.code === "VHT21") ? 0 : fail.length ? 1 : 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
