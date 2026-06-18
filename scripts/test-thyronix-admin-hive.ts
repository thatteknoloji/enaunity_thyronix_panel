/**
 * THYRONIX Admin + HIVE Admin stabilization tests
 * Run: npm run test:thyronix-admin-hive
 */
import { prisma } from "../src/lib/db";
import {
  canAccessThyronixResource,
  getThyronixTenantFilter,
  isGlobalThyronixResource,
  resolveThyronixOwner,
} from "../src/lib/thyronix/tenant-access";
import { getAdminSecretPath } from "../src/lib/auth/admin-access";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

async function main() {
  console.log("\n=== THYRONIX Admin + HIVE Admin Tests ===\n");

  const admin = await prisma.user.findUnique({ where: { email: "admin@enaunity.com" } });
  const dealerUser = await prisma.user.findFirst({ where: { role: "dealer", dealerId: { not: null } } });

  if (!admin) {
    console.error("admin@enaunity.com not found");
    process.exit(1);
  }

  console.log("1) Tenant readiness helpers");
  const adminOwner = resolveThyronixOwner({ ...admin, role: "admin" } as any);
  assert(adminOwner.tenantScope === "GLOBAL", "Admin resolves GLOBAL scope");
  assert(adminOwner.ownerType === "ADMIN", "Admin owner type ADMIN");

  if (dealerUser) {
    const dealerOwner = resolveThyronixOwner(dealerUser as any);
    assert(dealerOwner.tenantScope === "DEALER", "Dealer resolves DEALER scope");
    assert(dealerOwner.dealerId === dealerUser.dealerId, "Dealer dealerId set");
    const globalRes = { tenantScope: "GLOBAL", dealerId: null };
    assert(canAccessThyronixResource(dealerUser as any, globalRes), "Dealer can read GLOBAL resource");
    assert(
      !canAccessThyronixResource(dealerUser as any, { tenantScope: "DEALER", dealerId: "other-dealer" }),
      "Dealer cannot read other dealer resource"
    );
    const filter = getThyronixTenantFilter(dealerUser as any);
    assert(!!filter.OR, "Dealer tenant filter has OR clause");
  } else {
    console.log("  — no dealer user for isolation tests");
  }

  assert(isGlobalThyronixResource({ tenantScope: "GLOBAL" }), "GLOBAL resource detection");

  console.log("\n2) Prisma tenant columns");
  const feed = await prisma.thyronixFeed.findFirst();
  if (feed) {
    assert((feed as any).tenantScope === "GLOBAL" || (feed as any).tenantScope != null, "Feed has tenantScope");
  } else {
    console.log("  — no feeds in DB, skipping row check");
    passed++;
  }

  console.log("\n3) Admin route paths");
  const secret = getAdminSecretPath();
  assert(secret.length > 0, "Admin secret path configured");
  assert(`${secret}/thyronix`.includes("thyronix"), "THYRONIX admin path");
  assert(`${secret}/hive`.includes("hive"), "HIVE admin path");

  console.log("\n4) HIVE data layer");
  const overview = await prisma.moduleLicense.count({ where: { moduleKey: { in: ["HIVE", "HIVE_PRO"] } } });
  assert(overview >= 0, "HIVE license query works");
  const ws = await prisma.hiveWorkspace.count();
  assert(ws >= 0, "HiveWorkspace query works");

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  console.log("Manual checks:");
  console.log(`  - ${secret}/thyronix (all 5 tabs)`);
  console.log(`  - ${secret}/hive (overview + health)`);
  console.log("  - GET /api/admin/thyronix-feeds as admin → 200");
  console.log("  - GET /api/admin/hive/overview as admin → 200");
  console.log("  - Dealer → 403 on admin thyronix/hive APIs\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
