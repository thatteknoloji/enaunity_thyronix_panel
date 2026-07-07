/**
 * Ersa Güdü tam kurulum: kurallar + feed seed (+ isteğe bağlı sync).
 * Run: npx tsx scripts/setup-ersa-gudu.ts
 * Sync: npx tsx scripts/setup-ersa-gudu.ts --sync
 */
import { prisma } from "../src/lib/db";
import { seedErsaGuduPackage } from "../src/lib/thyronix/connectors/vht-seed-service";
import { ERSA_GUDU_STARTER_RULES } from "./seed-ersa-rules";
import {
  ensureDefaultGlobalProfile,
  updateRulesProfile,
} from "../src/lib/thyronix/rules/profile-service";
import { resolveVhtTargetDealerId } from "../src/lib/thyronix/connectors/vht-seed-service";

async function seedRules(dealerId: string) {
  const profile = await ensureDefaultGlobalProfile(dealerId);
  await updateRulesProfile(profile.id, dealerId, {
    name: "Genel Kurallar — Ersa Güdü",
    ...ERSA_GUDU_STARTER_RULES,
  });

  const ws = await prisma.thyronixWorkspaceSettings.findFirst({ where: { dealerId } });
  if (ws) {
    let automation: Record<string, unknown> = {};
    try {
      automation = JSON.parse(ws.automationJson || "{}");
    } catch {
      automation = {};
    }
    automation.feedTransform = {
      enabled: true,
      targetBrand: "Esra'nın Dünyası",
      sourceBrandAliases: ["BEZOS", "BEZOS HOME", "Bayi Markası"],
      bannedWords: ["çakma", "taklit", "replika", "muadil"],
      titlePrefix: "",
      titleSuffix: "",
      descriptionPrefix: "",
      descriptionSuffix: "",
      maxTitleLength: 120,
    };
    await prisma.thyronixWorkspaceSettings.update({
      where: { id: ws.id },
      data: { automationJson: JSON.stringify(automation) },
    });
  }
}

async function main() {
  const doSync = process.argv.includes("--sync");
  const dealerId = await resolveVhtTargetDealerId();
  if (!dealerId) {
    console.error("✗ Hedef bayi yok — production DB'de esraguden840@gmail.com veya BEZOS_BAYI_TARGET_DEALER_ID gerekli");
    process.exit(1);
  }

  console.log("=== 1/2 Kurallar ===");
  await seedRules(dealerId);
  console.log("✓ Genel kurallar uygulandı\n");

  console.log(`=== 2/2 Feed seed${doSync ? " + sync" : ""} ===`);
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
  process.exit(fail.length && fail.every((f) => f.code === "VHT21") ? 0 : fail.length ? 1 : 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
