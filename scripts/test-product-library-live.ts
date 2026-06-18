/**
 * Product Library Live Readiness tests
 * Run: npx tsx scripts/test-product-library-live.ts
 */
import { prisma } from "../src/lib/db";
import { syncCatalogItems, resolveCatalogItemKey } from "../src/lib/product-library/import-sync";
import { runXmlImport } from "../src/lib/product-library/import-xml";
import { runExcelImport } from "../src/lib/product-library/import-excel";
import { dealerCanAccessPackage } from "../src/lib/product-library/access";
import {
  requestPackagePurchase,
  grantProductLibraryAccessFromPayment,
  getProductLibraryOverview,
} from "../src/lib/product-library/package-access-service";
import { approvePayment } from "../src/lib/payments/payment-service";
import { getCustomerProductsOverview } from "../src/lib/customer-products/service";
import { CUSTOMER_PRODUCT_KEYS } from "../src/lib/customer-products/types";
import { parseXmlProducts } from "../src/lib/product-library/xml";
import { mapRowsToItems } from "../src/lib/product-library/excel";

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

const TEST_PREFIX = "pl-live-";
const SAMPLE_XML = `<?xml version="1.0"?>
<products>
  <product>
    <barcode>PL-LIVE-001</barcode>
    <sku>SKU-L1</sku>
    <name>Live Test Ürün</name>
    <brand>LiveMarka</brand>
    <category>Test</category>
    <price>100</price>
    <stock>5</stock>
  </product>
</products>`;

const SAMPLE_XML_V2 = `<?xml version="1.0"?>
<products>
  <product>
    <barcode>PL-LIVE-001</barcode>
    <sku>SKU-L1</sku>
    <name>Live Test Ürün Güncel</name>
    <brand>LiveMarka</brand>
    <category>Test</category>
    <price>120</price>
    <stock>8</stock>
  </product>
  <product>
    <barcode>PL-LIVE-002</barcode>
    <sku>SKU-L2</sku>
    <name>Yeni Ürün</name>
    <brand>LiveMarka</brand>
    <category>Test</category>
    <price>50</price>
    <stock>2</stock>
  </product>
</products>`;

async function ensureTestDealer() {
  let dealer = await prisma.dealer.findFirst({ where: { email: "pl-live-test@ena.com" } });
  if (!dealer) {
    dealer = await prisma.dealer.create({
      data: {
        name: "PL Live Test",
        title: "PL Live Test",
        email: "pl-live-test@ena.com",
        phone: "5550000000",
        company: "PL Live Test Ltd",
        location: "Istanbul",
        companySize: "1-10",
        markets: "TR",
        status: "active",
      },
    });
  }
  let user = await prisma.user.findFirst({ where: { email: "pl-live-test-user@ena.com" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "pl-live-test-user@ena.com",
        name: "PL Live User",
        password: "test",
        role: "dealer",
        dealerId: dealer.id,
      },
    });
  }
  return { dealer, user };
}

async function cleanup() {
  const catalogs = await prisma.productCatalog.findMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  for (const c of catalogs) {
    await prisma.productCatalogItem.deleteMany({ where: { catalogId: c.id } });
    await prisma.productSupplier.deleteMany({ where: { catalogId: c.id } });
  }
  const packages = await prisma.productPackage.findMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  for (const p of packages) {
    await prisma.productDistributionLog.deleteMany({ where: { packageId: p.id } });
    await prisma.productPackageAccess.deleteMany({ where: { packageId: p.id } });
  }
  await prisma.productPackage.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  await prisma.productCatalog.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  await prisma.productImportJob.deleteMany({ where: { createdBy: { contains: "pl-live-test" } } });
  await prisma.modulePayment.deleteMany({ where: { planKey: { startsWith: TEST_PREFIX } } });
}

async function main() {
  console.log("\n=== Product Library Live Readiness Tests ===\n");
  await cleanup();

  const catalog = await prisma.productCatalog.create({
    data: { name: "Live Test Catalog", slug: `${TEST_PREFIX}catalog`, status: "ACTIVE" },
  });

  const { dealer, user } = await ensureTestDealer();
  if (!dealer) {
    console.error("Could not create test dealer");
    process.exit(1);
  }

  // 1) XML re-import no duplicates + delta report
  console.log("1) XML import sync");
  const xml1 = await runXmlImport({
    catalogId: catalog.id,
    xmlContent: SAMPLE_XML,
    createdBy: "pl-live-test@ena.com",
  });
  assert(xml1.addedCount === 1, "XML first import adds 1");
  const countAfterFirst = await prisma.productCatalogItem.count({ where: { catalogId: catalog.id, status: "ACTIVE" } });
  assert(countAfterFirst === 1, "XML active item count is 1");

  const xml2 = await runXmlImport({
    catalogId: catalog.id,
    xmlContent: SAMPLE_XML_V2,
    createdBy: "pl-live-test@ena.com",
  });
  const countAfterSecond = await prisma.productCatalogItem.count({ where: { catalogId: catalog.id, status: "ACTIVE" } });
  assert(countAfterSecond === 2, "XML re-import does not duplicate (2 active)");
  assert(xml2.addedCount === 1 && xml2.updatedCount === 1, "XML delta: 1 added, 1 updated");

  // 2) Excel re-import
  console.log("\n2) Excel/CSV import sync");
  const excelCatalog = await prisma.productCatalog.create({
    data: { name: "Excel Live", slug: `${TEST_PREFIX}excel`, status: "ACTIVE" },
  });
  const rows1 = [{ barcode: "EX-1", sku: "E1", name: "Excel Item", brand: "B", category: "C", price: "10", stock: "1" }];
  const buf1 = Buffer.from("barcode,sku,name,brand,category,price,stock\nEX-1,E1,Excel Item,B,C,10,1");
  const ex1 = await runExcelImport({
    catalogId: excelCatalog.id,
    fileName: "test.csv",
    buffer: buf1,
    mapping: {},
    createdBy: "pl-live-test@ena.com",
  });
  assert(ex1.addedCount === 1, "CSV first import adds 1");

  const buf2 = Buffer.from("barcode,sku,name,brand,category,price,stock\nEX-1,E1,Excel Item Updated,B,C,15,2\nEX-2,E2,New Excel,B,C,20,3");
  const ex2 = await runExcelImport({
    catalogId: excelCatalog.id,
    fileName: "test.csv",
    buffer: buf2,
    mapping: {},
    createdBy: "pl-live-test@ena.com",
  });
  const excelActive = await prisma.productCatalogItem.count({ where: { catalogId: excelCatalog.id, status: "ACTIVE" } });
  assert(excelActive === 2, "CSV re-import no duplicate (2 active)");
  assert(ex2.updatedCount >= 1 && ex2.addedCount >= 1, "CSV delta report has updated + added");

  // 3) syncCatalogItems removed count
  console.log("\n3) Import removes missing items");
  const removedReport = await syncCatalogItems({
    catalogId: excelCatalog.id,
    supplierId: null,
    items: mapRowsToItems([{ barcode: "EX-2", sku: "E2", name: "New Excel", brand: "B", category: "C", price: "20", stock: "3" }]),
    sourceType: "CSV",
  });
  assert(removedReport.removedCount >= 1, "sync deactivates missing source items");

  // 4) Purchase + admin approve + download access
  console.log("\n4) Purchase flow");
  const paidPkg = await prisma.productPackage.create({
    data: {
      name: "Live Paid Paket",
      slug: `${TEST_PREFIX}paid`,
      catalogIds: JSON.stringify([catalog.id]),
      licenseLevel: "PRO",
      status: "ACTIVE",
      billingType: "ONE_TIME",
      oneTimePrice: 999,
      monthlyPrice: 0,
      isFree: false,
    },
  });

  const denied = await dealerCanAccessPackage(dealer.id, paidPkg.id);
  assert(!denied.ok, "Dealer cannot download unpaid package");

  const purchase = await requestPackagePurchase(dealer.id, paidPkg.id);
  assert(!purchase.free && !!purchase.paymentId, "Purchase creates ModulePayment");

  const pendingAccess = await prisma.productPackageAccess.findUnique({
    where: { packageId_dealerId: { packageId: paidPkg.id, dealerId: dealer.id } },
  });
  assert(pendingAccess?.status === "PENDING", "ProductPackageAccess is PENDING");

  const stillDenied = await dealerCanAccessPackage(dealer.id, paidPkg.id);
  assert(!stillDenied.ok, "Download still blocked before approval");

  await approvePayment(purchase.paymentId!);
  const approvedAccess = await prisma.productPackageAccess.findUnique({
    where: { packageId_dealerId: { packageId: paidPkg.id, dealerId: dealer.id } },
  });
  assert(approvedAccess?.status === "ACTIVE", "Admin approve opens package access");

  const allowed = await dealerCanAccessPackage(dealer.id, paidPkg.id);
  assert(allowed.ok, "Dealer can download after approval");

  // 5) Distribution log
  console.log("\n5) Distribution log");
  const { logDistribution } = await import("../src/lib/product-library/access");
  await logDistribution({
    packageId: paidPkg.id,
    dealerId: dealer.id,
    format: "XML",
    userId: user?.id || "",
    userEmail: user?.email || "test@ena.com",
    ipAddress: "127.0.0.1",
    userAgent: "pl-live-test",
  });
  const log = await prisma.productDistributionLog.findFirst({
    where: { packageId: paidPkg.id, dealerId: dealer.id },
    orderBy: { createdAt: "desc" },
  });
  assert(!!log && log.format === "XML" && log.ipAddress === "127.0.0.1", "Distribution log written with IP");

  // 6) Customer center PRODUCT_LIBRARY card
  console.log("\n6) Customer center card");
  assert(CUSTOMER_PRODUCT_KEYS.includes("PRODUCT_LIBRARY"), "PRODUCT_LIBRARY in customer product keys");
  if (user) {
    const overview = await getCustomerProductsOverview({
      id: user.id,
      email: user.email,
      name: user.name || "",
      role: user.role,
      dealerId: dealer.id,
    });
    const plCard = overview.products.find((p) => p.moduleKey === "PRODUCT_LIBRARY");
    assert(!!plCard, "PRODUCT_LIBRARY card visible in customer center");
    assert(!!plCard?.libraryStats, "PRODUCT_LIBRARY card has library stats");
  } else {
    console.log("  ⚠ No user for dealer — skipping customer center API test");
  }

  // 7) Item key resolution
  console.log("\n7) Identity keys");
  const keyBarcode = resolveCatalogItemKey(catalog.id, { name: "A", barcode: "X", sku: "" });
  const keySku = resolveCatalogItemKey(catalog.id, { name: "B", barcode: "", sku: "Y" });
  const keyName = resolveCatalogItemKey(catalog.id, { name: "  C Item  ", barcode: "", sku: "" });
  assert(keyBarcode.includes("barcode"), "Key uses barcode first");
  assert(keySku.includes("sku"), "Key uses sku when no barcode");
  assert(keyName.includes("name"), "Key uses normalized name fallback");

  await cleanup();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
