/**
 * Site içerik seed — sayfalar (SSS, Kargo, İade, İletişim) ve sözleşmeler.
 * Çalıştır: npx tsx scripts/seed-site-content.ts
 */
import { PrismaClient } from "@prisma/client";
import { DEFAULT_CONTRACTS, DEFAULT_PAGES } from "../src/lib/pages/default-content";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding site pages...");
  for (const page of DEFAULT_PAGES) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        template: page.template,
        content: page.content,
        order: page.order,
        active: true,
      },
      create: {
        title: page.title,
        slug: page.slug,
        template: page.template,
        content: page.content,
        order: page.order,
        active: true,
      },
    });
    console.log(`  ✓ Page: /${page.slug} (${page.template})`);
  }

  console.log("Seeding contracts...");
  for (const contract of DEFAULT_CONTRACTS) {
    await prisma.contract.upsert({
      where: { slug: contract.slug },
      update: {
        title: contract.title,
        type: contract.type,
        content: contract.content,
        active: true,
      },
      create: {
        title: contract.title,
        slug: contract.slug,
        type: contract.type,
        content: contract.content,
        active: true,
      },
    });
    console.log(`  ✓ Contract: /contracts/${contract.slug}`);
  }

  const footerDefaults = [
    { key: "contact_email", value: "info@enaunity.com" },
    { key: "contact_phone", value: "+90 (212) 555 00 00" },
    { key: "address", value: "Maslak Mah. Büyükdere Cad. No:1\nSarıyer / İstanbul" },
  ];

  for (const item of footerDefaults) {
    await prisma.footerSettings.upsert({
      where: { key: item.key },
      update: {},
      create: item,
    });
  }
  console.log("  ✓ Footer contact defaults (only if missing)");

  console.log("\nDone. Admin: /admin/pages | /admin/contracts");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
