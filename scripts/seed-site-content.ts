/**
 * Site içerik seed — sayfalar (SSS, Kargo, İade, İletişim) ve sözleşmeler.
 * Çalıştır: npm run seed:site-content
 */
import { PrismaClient } from "@prisma/client";
import { seedSiteContent } from "../src/lib/pages/seed-site-content";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding site pages & contracts...");
  const result = await seedSiteContent();
  for (const slug of result.pageSlugs) {
    console.log(`  ✓ Page: /${slug}`);
  }
  for (const slug of result.contractSlugs) {
    console.log(`  ✓ Contract: /contracts/${slug}`);
  }
  console.log("  ✓ Footer contact defaults (only if missing)");
  console.log(`\nDone (${result.pages} pages, ${result.contracts} contracts).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
