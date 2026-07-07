/**
 * Ersa Güdü — Thyronix genel kurallarını yapılandırır.
 * Run: npx tsx scripts/seed-ersa-rules.ts
 */
import { prisma } from "../src/lib/db";
import { resolveVhtTargetDealerId } from "../src/lib/thyronix/connectors/vht-seed-service";
import {
  ensureDefaultGlobalProfile,
  updateRulesProfile,
} from "../src/lib/thyronix/rules/profile-service";
import type { ThyronixAiRules, ThyronixGateRules, ThyronixPriceRules, ThyronixStockRules } from "../src/lib/thyronix/rules/types";

/** Ersa Güdü başlangıç kuralları — panelden sonra ince ayar yapılabilir. */
export const ERSA_GUDU_STARTER_RULES = {
  price: {
    mode: "flat" as const,
    multiplier: 2.5,
    fixedAdjustment: 0,
    tiers: [],
    roundTo: 0,
    baseField: "price" as const,
  } satisfies ThyronixPriceRules,
  stock: {
    hideBelowStock: 3,
    lowStockWarning: 3,
  } satisfies ThyronixStockRules,
  gate: {
    requireImage: true,
    requireDescription: true,
    requireBarcode: true,
    requireCategory: true,
    requireVatRate: true,
    requireVariants: true,
  } satisfies ThyronixGateRules,
  ai: {
    enabled: false,
    autoOnNewProducts: false,
    stripBrandFromTitle: true,
    titlePrefix: "",
    titleSuffix: "",
    descriptionPrefix: "",
    descriptionSuffix: "",
    bannedWords: ["çakma", "taklit", "replika", "muadil"],
  } satisfies ThyronixAiRules,
};

async function main() {
  const dealerId = await resolveVhtTargetDealerId();
  if (!dealerId) {
    console.error("Hedef bayi bulunamadı. BEZOS_BAYI_TARGET_DEALER_ID veya BEZOS_BAYI_ALLOWED_EMAILS ayarlayın.");
    process.exit(1);
  }

  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
  console.log(`Hedef bayi: ${dealer?.name || dealerId}`);

  const profile = await ensureDefaultGlobalProfile(dealerId);
  const updated = await updateRulesProfile(profile.id, dealerId, {
    name: "Genel Kurallar — Ersa Güdü",
    ...ERSA_GUDU_STARTER_RULES,
  });

  // Workspace feed transform (çıktı marka / yasaklı kelimeler)
  const ws = await prisma.thyronixWorkspaceSettings.findFirst({ where: { dealerId } });
  const feedTransform = {
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

  if (ws) {
    let automation: Record<string, unknown> = {};
    try {
      automation = JSON.parse(ws.automationJson || "{}");
    } catch {
      automation = {};
    }
    automation.feedTransform = feedTransform;
    await prisma.thyronixWorkspaceSettings.update({
      where: { id: ws.id },
      data: { automationJson: JSON.stringify(automation) },
    });
    console.log("✓ Workspace feed transform güncellendi");
  } else {
    console.log("ℹ ThyronixWorkspaceSettings yok — feed transform atlandı (ilk girişte oluşur)");
  }

  console.log("\n=== Genel Kurallar ===");
  console.log(`Profil: ${updated.name} (${updated.id})`);
  console.log(`Fiyat: ×${updated.price.multiplier} (${updated.price.mode})`);
  console.log(`Stok gizleme eşiği: ${updated.stock.hideBelowStock ?? "kapalı"} adet`);
  console.log(
    `Kalite: görsel=${updated.gate.requireImage}, açıklama=${updated.gate.requireDescription}, barkod=${updated.gate.requireBarcode}, kategori=${updated.gate.requireCategory}, kdv=${updated.gate.requireVatRate}, varyant=${updated.gate.requireVariants}`,
  );
  console.log(`AI: ${updated.ai.enabled ? "açık" : "kapalı"} · marka silme=${updated.ai.stripBrandFromTitle}`);
  console.log(`Çıktı markası: ${feedTransform.targetBrand}`);
  console.log(`Yasaklı kelimeler: ${updated.ai.bannedWords.join(", ")}`);
  console.log("\nPanel: /thyronix/rules");
  console.log("Not: İstersen daha sonra fiyat kademeleri ve ek filtreleri panelden özelleştirebiliriz.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
