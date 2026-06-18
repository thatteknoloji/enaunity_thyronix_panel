/**
 * HIVE Integration Sprint tests
 * Run: npm run test:hive-integration
 */
import { prisma } from "../src/lib/db";
import {
  resolveHiveGatewayState,
  provisionHiveAccount,
  recordHiveSession,
  getHiveWorkspaceDealerKey,
  DEFAULT_HIVE_SETTINGS,
} from "../src/lib/hive/integration";
import { getModuleLicenseState } from "../src/lib/modules/access";

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

async function cleanup(enaUserId: string, dealerKey: string) {
  await prisma.hiveSessionBridge.deleteMany({ where: { enaUserId } });
  await prisma.hiveWorkspace.deleteMany({ where: { dealerId: dealerKey } }).catch(() => {});
  const links = await prisma.productAccountLink.findMany({ where: { enaUserId, productType: "HIVE" } });
  for (const link of links) {
    await prisma.productAccountLink.delete({ where: { id: link.id } }).catch(() => {});
    await prisma.productExternalUser.delete({ where: { id: link.externalUserId } }).catch(() => {});
  }
}

async function main() {
  console.log("\n=== HIVE Integration Tests ===\n");

  const admin = await prisma.user.findUnique({ where: { email: "admin@enaunity.com" } });
  const plainUser = await prisma.user.findFirst({ where: { role: "user", dealerId: null } });
  const dealerUser = await prisma.user.findFirst({ where: { role: "dealer", dealerId: { not: null } } });

  if (!admin) {
    console.error("admin@enaunity.com not found — run seed first");
    process.exit(1);
  }

  const adminDealerKey = getHiveWorkspaceDealerKey(admin);

  // 1) Unlicensed user blocked
  console.log("1) Unlicensed user blocked");
  if (plainUser) {
    const state = await resolveHiveGatewayState(plainUser);
    assert(
      state.step === "dealer_required" || state.step === "pricing",
      `User without dealer gets blocked (got: ${state.step})`
    );
  } else {
    console.log("  — skip: no plain user in DB");
  }

  if (dealerUser?.dealerId) {
    const licenseState = await getModuleLicenseState(dealerUser.dealerId, "HIVE");
    const dealerState = await resolveHiveGatewayState(dealerUser);
    if (licenseState === "none") {
      assert(dealerState.step === "pricing", "Dealer without HIVE license → pricing");
    } else if (licenseState === "pending") {
      assert(dealerState.step === "pending", "Dealer with pending license → pending");
    } else {
      assert(
        dealerState.step === "setup" || dealerState.step === "ready",
        `Licensed dealer → setup or ready (got: ${dealerState.step})`
      );
    }
  } else {
    console.log("  — skip: no dealer user in DB");
  }

  // 2) Licensed user gateway flow
  console.log("\n2) Licensed user gateway flow");
  await cleanup(admin.id, adminDealerKey);
  const beforeLink = await resolveHiveGatewayState(admin);
  assert(beforeLink.step === "setup", "Admin without link → setup (account create)");

  // 3) First provisioning creates workspace + link + session
  console.log("\n3) First-time provisioning");
  const provisioned = await provisionHiveAccount(admin);
  assert(provisioned.link.status === "LINKED", "Link record created");
  assert(!!provisioned.link.externalUserId, "HIVE external user (owner) created");
  assert(!!provisioned.workspace?.id, "Workspace created on first provision");
  assert(provisioned.workspace?.ownerUserId === provisioned.link.externalUserId, "Workspace owner set");

  const settings = JSON.parse(provisioned.workspace?.settingsJson || "{}");
  assert(settings.locale === DEFAULT_HIVE_SETTINGS.locale, "Default settings applied");
  assert(provisioned.redirectTo.includes("/hive/login"), "Redirect to HIVE login");

  const sessionAfterProvision = await prisma.hiveSessionBridge.findFirst({
    where: { enaUserId: admin.id, hiveUserId: provisioned.link.externalUserId },
  });
  assert(!!sessionAfterProvision, "Session bridge record on provision");
  assert(sessionAfterProvision?.workspaceId === provisioned.workspace?.id, "Session linked to workspace");

  // 4) Existing link → ready → login
  console.log("\n4) Existing link → login");
  const afterLink = await resolveHiveGatewayState(admin);
  assert(afterLink.step === "ready", "Linked user → ready");
  assert(!!afterLink.redirectTo?.includes("/hive/login"), "Redirect to HIVE login screen");
  assert(afterLink.workspaceId === provisioned.workspace?.id, "Gateway includes workspace id");

  // 5) Session tracking on login
  console.log("\n5) Session tracking");
  await recordHiveSession({
    dealerId: admin.dealerId || "",
    enaUserId: admin.id,
    hiveUserId: provisioned.link.externalUserId,
    workspaceId: provisioned.workspace?.id,
  });
  const sessions = await prisma.hiveSessionBridge.count({ where: { enaUserId: admin.id } });
  assert(sessions >= 1, "Session record exists after login tracking");

  await cleanup(admin.id, adminDealerKey);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
