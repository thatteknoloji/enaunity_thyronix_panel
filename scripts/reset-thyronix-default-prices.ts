/**
 * Tüm bayilerin varsayılan Thyronix fiyat kurallarını ×1 (passthrough) yapar.
 * Run: npx tsx scripts/reset-thyronix-default-prices.ts
 * Opsiyonel: npx tsx scripts/reset-thyronix-default-prices.ts <dealerId>
 */
import { prisma } from "../src/lib/db";
import { defaultRulesBundle } from "../src/lib/thyronix/rules/types";
import { profileToRulesBundle } from "../src/lib/thyronix/rules/resolver";
import type { ThyronixRulesBundle } from "../src/lib/thyronix/rules/types";

const dealerFilter = process.argv[2]?.trim();

function resetPriceRules(bundle: ThyronixRulesBundle): ThyronixRulesBundle {
  const base = defaultRulesBundle().price;
  return {
    ...bundle,
    price: {
      ...bundle.price,
      mode: "flat",
      multiplier: 1,
      fixedAdjustment: 0,
      baseField: bundle.price.baseField || base.baseField,
    },
  };
}

async function main() {
  const profiles = await prisma.thyronixRulesProfile.findMany({
    where: {
      isDefault: true,
      scope: "global",
      ...(dealerFilter ? { dealerId: dealerFilter } : {}),
    },
  });

  let updated = 0;
  for (const profile of profiles) {
    const bundle = resetPriceRules(profileToRulesBundle(profile));
    await prisma.thyronixRulesProfile.update({
      where: { id: profile.id },
      data: { priceRulesJson: JSON.stringify(bundle.price) },
    });
    updated++;
    console.log(`✓ ${profile.name} (${profile.dealerId || "platform"}) → multiplier 1`);
  }

  console.log(`\nOK: ${updated} profil güncellendi`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
