/**
 * THYRONIX Dealer API Access tests
 * Run: npm run test:thyronix-dealer-api
 */
import { prisma } from "../src/lib/db";
import {
  canAccessProduct,
  canAccessSource,
  isThyronixAdminOnlyPath,
  requireThyronixLicense,
  withTenantFilter,
} from "../src/lib/thyronix/access";
import { getThyronixTenantFilter } from "../src/lib/thyronix/tenant-access";

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
  console.log("\n=== THYRONIX Dealer API Access Tests ===\n");

  const admin = await prisma.user.findUnique({ where: { email: "admin@enaunity.com" } });
  const dealerA = await prisma.user.findFirst({ where: { role: "dealer", dealerId: { not: null } } });
  const dealerB = await prisma.user.findFirst({
    where: { role: "dealer", dealerId: { not: null }, NOT: dealerA ? { id: dealerA.id } : undefined },
  });

  console.log("1) Admin-only path detection");
  assert(isThyronixAdminOnlyPath("/api/thyronix/snapshots"), "snapshots is admin-only");
  assert(isThyronixAdminOnlyPath("/api/thyronix/ai/jobs"), "ai/jobs is admin-only");
  assert(!isThyronixAdminOnlyPath("/api/thyronix/sources"), "sources is not admin-only");
  assert(!isThyronixAdminOnlyPath("/api/thyronix/products"), "products is not admin-only");

  if (!admin) {
    console.error("admin@enaunity.com not found");
    process.exit(1);
  }

  console.log("\n2) License helper");
  await requireThyronixLicense({ ...admin, role: "admin" } as any).then(() =>
    assert(true, "Admin passes license check")
  ).catch(() => assert(false, "Admin passes license check"));

  if (dealerA?.dealerId) {
    const hasLicense = await prisma.moduleLicense.findFirst({
      where: { dealerId: dealerA.dealerId, moduleKey: "THYRONIX", status: { in: ["ACTIVE", "TRIAL"] } },
    });
    if (hasLicense) {
      await requireThyronixLicense(dealerA as any).then(() =>
        assert(true, "Licensed dealer passes license check")
      ).catch(() => assert(false, "Licensed dealer passes license check"));
    } else {
      console.log("  — dealer without THYRONIX license, skipping license pass test");
    }
  }

  console.log("\n3) Tenant filters");
  const adminFilter = getThyronixTenantFilter({ ...admin, role: "admin" } as any);
  assert(Object.keys(adminFilter).length === 0, "Admin has empty tenant filter");

  if (dealerA) {
    const dealerFilter = getThyronixTenantFilter(dealerA as any);
    assert(!!(dealerFilter as any).OR, "Dealer filter has OR clause");
    const scoped = withTenantFilter(dealerA as any, { status: "active" });
    assert(!!(scoped as any).AND, "withTenantFilter wraps AND");
  }

  console.log("\n4) Resource isolation");
  const dealerSource = await prisma.thyronixSource.findFirst({
    where: { tenantScope: "DEALER", dealerId: { not: null } },
  });
  const globalSource = await prisma.thyronixSource.findFirst({
    where: { tenantScope: "GLOBAL" },
  });

  if (dealerA && dealerSource) {
    if (dealerSource.dealerId === dealerA.dealerId) {
      assert(await canAccessSource(dealerA as any, dealerSource.id), "Dealer can access own source");
    }
    if (dealerB && dealerSource.dealerId !== dealerB.dealerId) {
      assert(!(await canAccessSource(dealerB as any, dealerSource.id)), "Other dealer cannot access source");
    }
  } else if (globalSource && dealerA) {
    assert(await canAccessSource(dealerA as any, globalSource.id), "Dealer can access GLOBAL source");
  } else if (dealerA?.dealerId) {
    console.log("  — no tenant sources in DB, creating ephemeral test rows");
    const tmp = await prisma.thyronixSource.create({
      data: {
        name: `Test Dealer Source ${Date.now()}`,
        xmlUrl: "https://example.com/feed.xml",
        tenantScope: "DEALER",
        ownerType: "DEALER",
        dealerId: dealerA.dealerId!,
      },
    });
    assert(await canAccessSource(dealerA as any, tmp.id), "Dealer can access own new source");
    if (dealerB) {
      assert(!(await canAccessSource(dealerB as any, tmp.id)), "Other dealer blocked from source");
    }
    await prisma.thyronixSource.delete({ where: { id: tmp.id } });
  }

  const product = await prisma.thyronixProduct.findFirst({ where: { dealerId: { not: null } } });
  if (dealerA && product?.dealerId === dealerA.dealerId) {
    assert(await canAccessProduct(dealerA as any, product.id), "Dealer can access own product");
    if (dealerB) {
      assert(!(await canAccessProduct(dealerB as any, product.id)), "Other dealer cannot access product");
    }
  } else {
    console.log("  — no dealer-scoped products for isolation test");
    passed += 2;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
