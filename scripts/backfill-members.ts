/**
 * Ensure all site members have status + checklist for admin Üyeler panel.
 * Run on server: set -a && source .env.production && set +a && npx tsx scripts/backfill-members.ts
 */
import { prisma } from "../src/lib/db";
import { EMPTY_MEMBER_CHECKLIST } from "../src/lib/members/checklist";

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["user", "dealer"] } },
    orderBy: { createdAt: "asc" },
  });

  let updated = 0;
  for (const u of users) {
    const patch: Record<string, unknown> = {};
    if (!u.status || u.status === "") patch.status = "active";
    if (!u.approvalChecklistJson || u.approvalChecklistJson === "{}") {
      patch.approvalChecklistJson = JSON.stringify({
        ...EMPTY_MEMBER_CHECKLIST,
        emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email),
        identityVerified: u.name.trim().length >= 3,
        kvkkAccepted: true,
      });
    }
    if (Object.keys(patch).length) {
      await prisma.user.update({ where: { id: u.id }, data: patch });
      updated++;
      console.log(`  ✓ ${u.email} → status=${patch.status || u.status}`);
    } else {
      console.log(`  · ${u.email} (${u.status})`);
    }
  }

  console.log(`\nDone: ${users.length} members scanned, ${updated} updated.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
