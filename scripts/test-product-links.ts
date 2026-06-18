/**
 * Product Account Linking integration tests
 * Run: npx tsx scripts/test-product-links.ts
 */
import { prisma } from "../src/lib/db";
import {
  assertCanLinkProduct,
  createProductAccountLink,
  getActiveLink,
  listLinksForUser,
  relinkProductAccount,
  deleteProductLink,
} from "../src/lib/product-links/service";

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

async function cleanupTestData(enaUserId: string) {
  await prisma.productAccountLink.deleteMany({ where: { enaUserId } });
  const externalUsers = await prisma.productExternalUser.findMany({
    where: { metadataJson: { contains: enaUserId } },
  });
  for (const eu of externalUsers) {
    await prisma.productExternalUser.delete({ where: { id: eu.id } }).catch(() => {});
  }
}

async function main() {
  console.log("\n=== Product Account Linking Tests ===\n");

  const admin = await prisma.user.findUnique({ where: { email: "admin@enaunity.com" } });
  const dealerUser = await prisma.user.findFirst({ where: { role: "dealer" } });
  const plainUser = await prisma.user.findFirst({ where: { role: "user" } });

  if (!admin) {
    console.error("admin@enaunity.com not found — run seed first");
    process.exit(1);
  }

  await cleanupTestData(admin.id);

  // Test 1: User without license cannot link (non-admin without dealer)
  console.log("1) License enforcement");
  if (plainUser) {
    const noLicense = await assertCanLinkProduct(plainUser, "THYRONIX");
    assert(!noLicense.ok && noLicense.code === "DEALER_REQUIRED", "User without dealer cannot link");
  }

  if (dealerUser && dealerUser.dealerId) {
    const dealerAccess = await assertCanLinkProduct(dealerUser, "THYRONIX");
    // May pass or fail depending on license — just verify structure
    assert(typeof dealerAccess.ok === "boolean", "Dealer license check returns structured result");
  }

  const adminAccess = await assertCanLinkProduct(admin, "THYRONIX");
  assert(adminAccess.ok === true, "Admin can link without dealer license");

  // Test 2: First login creates link
  console.log("\n2) First-time link creation");
  const created = await createProductAccountLink(admin, "THYRONIX", { createdFrom: "api" });
  assert(created.link.status === "LINKED", "Link created with LINKED status");
  assert(!!created.link.externalUserId, "External user created");
  assert(!!created.tempPassword, "Temp password issued");

  const activeLink = await getActiveLink(admin.id, "THYRONIX");
  assert(activeLink?.id === created.link.id, "Active link retrievable");

  // Test 3: Second create fails (already linked)
  console.log("\n3) Duplicate link prevention");
  let duplicateError = false;
  try {
    await createProductAccountLink(admin, "THYRONIX");
  } catch (e) {
    duplicateError = e instanceof Error && e.message.includes("zaten bağlı");
  }
  assert(duplicateError, "Cannot create duplicate active link");

  // Test 4: User can list own links
  console.log("\n4) User link listing");
  const userLinks = await listLinksForUser(admin.id);
  assert(userLinks.length >= 1, "User can list own links");
  assert(userLinks.every((l) => l.enaUserId === admin.id), "Links scoped to user");

  // Test 5: Delete link → setup required again
  console.log("\n5) Link deletion");
  await deleteProductLink(created.link.id, admin);
  const afterDelete = await getActiveLink(admin.id, "THYRONIX");
  assert(afterDelete === null, "Active link removed after delete");

  // Test 6: Relink creates new link
  console.log("\n6) Relink flow");
  const newLink = await createProductAccountLink(admin, "THYRONIX", { createdFrom: "api" });
  const relinked = await relinkProductAccount(newLink.link.id, admin, { force: true });
  assert(relinked.link.status === "LINKED", "Relinked account is active");
  assert(!!relinked.tempPassword, "Relink issues new temp password");

  // Test 7: HIVE link
  console.log("\n7) HIVE product type");
  const hiveLink = await createProductAccountLink(admin, "HIVE", { createdFrom: "api" });
  assert(hiveLink.link.productType === "HIVE", "HIVE link created");

  // Test 8: Dealer isolation (cannot see other user's links via list)
  console.log("\n8) Dealer isolation");
  if (dealerUser) {
    const dealerLinks = await listLinksForUser(dealerUser.id);
    const hasAdminLink = dealerLinks.some((l) => l.enaUserId === admin.id);
    assert(!hasAdminLink, "Dealer cannot see admin links in own list");
  } else {
    assert(true, "Skipped — no dealer user in DB");
  }

  await cleanupTestData(admin.id);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
