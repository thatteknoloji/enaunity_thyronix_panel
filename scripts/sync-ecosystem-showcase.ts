/**
 * Eksik built-in vitrin ürünlerini oluşturur (ENA, THYRONIX, HIVE, LinkSlash, Page Factory).
 * Kart linklerini /platform/* + _self olarak düzeltir.
 * Run: npm run seed:ecosystem-showcase
 */
import { syncBuiltInShowcaseCardLinks, syncBuiltInShowcaseProducts } from "../src/lib/ecosystem/seed-defaults";

async function main() {
  await syncBuiltInShowcaseProducts();
  await syncBuiltInShowcaseCardLinks();
  console.log("✓ Ekosistem vitrin senkron tamam (kart linkleri + page-factory).");
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
