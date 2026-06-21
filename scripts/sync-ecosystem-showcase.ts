/**
 * Eksik built-in vitrin ürünlerini oluşturur (ENA, THYRONIX, HIVE, LinkSlash).
 * Mevcut admin düzenlemelerini ezmez.
 * Run: npm run seed:ecosystem-showcase
 */
import { syncBuiltInShowcaseProducts } from "../src/lib/ecosystem/seed-defaults";

async function main() {
  await syncBuiltInShowcaseProducts();
  console.log("✓ Ekosistem vitrin senkron tamam (linkslash dahil).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/db");
    await prisma.$disconnect();
  });
