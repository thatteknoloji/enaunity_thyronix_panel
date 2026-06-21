/**
 * Bayiye modül lisansı tanımla
 * npx tsx scripts/grant-module-license.ts esraguden840@gmail.com LINKSLASH starter 12
 */
import { prisma } from "../src/lib/db";
import { upsertModuleLicense } from "../src/lib/admin/module-access-admin";

const email = process.argv[2]?.trim().toLowerCase();
const moduleKey = (process.argv[3] || "LINKSLASH").toUpperCase();
const planKey = process.argv[4] || "starter";
const months = parseInt(process.argv[5] || "12", 10);

if (!email) {
  console.error("Usage: npx tsx scripts/grant-module-license.ts <email> [moduleKey] [planKey] [months]");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.dealerId) {
    console.error("Bayi bulunamadı veya dealerId yok:", email);
    process.exit(1);
  }

  const license = await upsertModuleLicense({
    dealerId: user.dealerId,
    moduleKey: moduleKey as "THYRONIX" | "HIVE" | "LINKSLASH",
    planKey,
    status: "ACTIVE",
    months,
  });

  await prisma.dealerApproval.upsert({
    where: { dealerId: user.dealerId },
    create: { dealerId: user.dealerId, status: "ACTIVE", approvedAt: new Date() },
    update: { status: "ACTIVE" },
  });

  console.log("OK", {
    email,
    dealerId: user.dealerId,
    moduleKey,
    planKey,
    months,
    licenseId: license.id,
    endsAt: license.endsAt,
    status: license.status,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
