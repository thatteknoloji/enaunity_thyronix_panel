/**
 * THYRONIX Integration Sprint tests
 * Run: npm run test:thyronix-integration
 */
import { prisma } from "../src/lib/db";
import {
  resolveThyronixGatewayState,
  provisionThyronixAccount,
  recordThyronixSession,
} from "../src/lib/thyronix/integration";
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

async function cleanup(enaUserId: string) {
  await prisma.thyronixSessionBridge.deleteMany({ where: { enaUserId } });
  const links = await prisma.productAccountLink.findMany({ where: { enaUserId, productType: "THYRONIX" } });
  for (const link of links) {
    await prisma.productAccountLink.delete({ where: { id: link.id } }).catch(() => {});
    await prisma.productExternalUser.delete({ where: { id: link.externalUserId } }).catch(() => {});
  }
}

async function main() {
  console.log("\n=== THYRONIX Integration Tests ===\n");

  const admin = await prisma.user.findUnique({ where: { email: "admin@enaunity.com" } });
  const plainUser = await prisma.user.findFirst({ where: { role: "user", dealerId: null } });
  const dealerUser = await prisma.user.findFirst({ where: { role: "dealer", dealerId: { not: null } } });

  if (!admin) {
    console.error("admin@enaunity.com not found — run seed first");
    process.exit(1);
  }

  // 1) Unlicensed user cannot access gateway (pricing/dealer_required)
  console.log("1) Unlicensed user blocked");
  if (plainUser) {
    const state = await resolveThyronixGatewayState(plainUser);
    assert(
      state.step === "dealer_required" || state.step === "pricing",
      `User without dealer gets blocked (got: ${state.step})`
    );
  } else {
    console.log("  — skip: no plain user in DB");
  }

  if (dealerUser?.dealerId) {
    const licenseState = await getModuleLicenseState(dealerUser.dealerId, "THYRONIX");
    const dealerState = await resolveThyronixGatewayState(dealerUser);
    if (licenseState === "none") {
      assert(dealerState.step === "pricing", "Dealer without THYRONIX license → pricing");
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

  // 2) Licensed user (admin bypass) → setup or ready
  console.log("\n2) Licensed user gateway flow");
  await cleanup(admin.id);
  const beforeLink = await resolveThyronixGatewayState(admin);
  assert(beforeLink.step === "setup", "Admin without link → setup (account create)");

  // 3) First login provisions account + link + session
  console.log("\n3) First-time provisioning");
  const provisioned = await provisionThyronixAccount(admin);
  assert(provisioned.link.status === "LINKED", "Link record created");
  assert(!!provisioned.link.externalUserId, "THYRONIX external user created");
  assert(provisioned.redirectTo.includes("/thyronix/login"), "Redirect to THYRONIX login");

  const sessionAfterProvision = await prisma.thyronixSessionBridge.findFirst({
    where: { enaUserId: admin.id, thyronixUserId: provisioned.link.externalUserId },
  });
  assert(!!sessionAfterProvision, "Session bridge record on provision");

  // 4) Link exists → ready → login redirect
  console.log("\n4) Existing link → login");
  const afterLink = await resolveThyronixGatewayState(admin);
  assert(afterLink.step === "ready", "Linked user → ready");
  assert(!!afterLink.redirectTo?.includes("/thyronix/login"), "Redirect to THYRONIX login screen");

  // 5) Session tracking on login
  console.log("\n5) Session tracking");
  await recordThyronixSession({
    dealerId: admin.dealerId || "",
    enaUserId: admin.id,
    thyronixUserId: provisioned.link.externalUserId,
  });
  const sessions = await prisma.thyronixSessionBridge.count({ where: { enaUserId: admin.id } });
  assert(sessions >= 1, "Session record exists after login tracking");

  await cleanup(admin.id);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
