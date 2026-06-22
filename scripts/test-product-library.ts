/**
 * Product Library Foundation tests
 * Run: npx tsx scripts/test-product-library.ts
 */
import { prisma } from "../src/lib/db";
import fs from "fs/promises";
import path from "path";
import {
  canAccessPackageLevel,
  levelsAllowedForDealer,
  normalizeLicenseLevel,
  getDealerLibraryTier,
} from "../src/lib/product-library/license";
import { parseXmlProducts } from "../src/lib/product-library/xml";
import { mapRowsToItems } from "../src/lib/product-library/excel";
import { dealerCanAccessPackage, getAccessiblePackages } from "../src/lib/product-library/access";
import { bulkInsertCatalogItems } from "../src/lib/product-library/items";
import { exportPackageItems } from "../src/lib/product-library/export";
import { slugify } from "../src/lib/product-library/types";
import { resolvePackageTemplate } from "../src/lib/product-library/template-engine";
import { buildRecipePreview } from "../src/lib/product-library/recipe-engine";
import { itemsToXlsxBuffer } from "../src/lib/product-library/excel";
import { commitPackageSourceImport, previewPackageSourceImport } from "../src/lib/product-library/package-import";
import {
  claimMarketplaceUploadJobs,
  completeMarketplaceUploadJob,
  createMarketplaceUploadJob,
  loadMarketplaceJobFile,
  resolveMarketplacePanelUrl,
} from "../src/lib/product-library/marketplace-jobs";

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

const TEST_PREFIX = "pl-test-";

async function cleanup() {
  const catalogs = await prisma.productCatalog.findMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  for (const c of catalogs) {
    await prisma.productCatalogItem.deleteMany({ where: { catalogId: c.id } });
    await prisma.productSupplier.deleteMany({ where: { catalogId: c.id } });
  }
  await prisma.productDistributionLog.deleteMany({
    where: { package: { slug: { startsWith: TEST_PREFIX } } },
  });
  if ((prisma as any).productMarketplaceJob?.deleteMany) {
    await (prisma as any).productMarketplaceJob.deleteMany({ where: { package: { slug: { startsWith: TEST_PREFIX } } } });
  }
  await prisma.productPackageRecipe.deleteMany({ where: { package: { slug: { startsWith: TEST_PREFIX } } } });
  if ((prisma as any).productPackageVersion?.deleteMany) {
    await (prisma as any).productPackageVersion.deleteMany({ where: { package: { slug: { startsWith: TEST_PREFIX } } } });
  }
  await prisma.marketplaceConnection.deleteMany({ where: { sellerId: { startsWith: TEST_PREFIX } } });
  await prisma.productPackage.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  await prisma.productCatalog.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  await prisma.productImportJob.deleteMany({ where: { createdBy: { contains: "pl-test" } } });
  await fs.rm(path.join(process.cwd(), "storage", "product-library", "packages"), { recursive: true, force: true });
  await fs.rm(path.join(process.cwd(), "storage", "product-library", "marketplace-jobs"), { recursive: true, force: true });
}

const SAMPLE_XML = `<?xml version="1.0"?>
<products>
  <product>
    <barcode>123456</barcode>
    <sku>SKU-1</sku>
    <name>Test Ürün</name>
    <brand>TestMarka</brand>
    <category>Elektronik</category>
    <price>100</price>
    <salePrice>90</salePrice>
    <stock>5</stock>
    <vatRate>20</vatRate>
  </product>
</products>`;

async function main() {
  console.log("\n=== Product Library Foundation Tests ===\n");
  await cleanup();

  // 1) License tier rules
  console.log("1) License tier rules");
  assert(levelsAllowedForDealer("FREE").join() === "FREE", "FREE sees FREE only");
  assert(levelsAllowedForDealer("STARTER").includes("STARTER"), "STARTER sees STARTER");
  assert(levelsAllowedForDealer("PRO").includes("PRO"), "PRO sees PRO");
  assert(levelsAllowedForDealer("ENTERPRISE").length === 4, "ENTERPRISE sees all");
  assert(canAccessPackageLevel("STARTER", "FREE"), "STARTER can access FREE package");
  assert(!canAccessPackageLevel("FREE", "PRO"), "FREE cannot access PRO package");
  assert(normalizeLicenseLevel("pro_plan") === "PRO", "normalize PRO plan");

  // 2) XML import parsing
  console.log("\n2) XML import parsing");
  const xmlItems = parseXmlProducts(SAMPLE_XML);
  assert(xmlItems.length === 1, "XML parser finds 1 product");
  assert(xmlItems[0].name === "Test Ürün", "XML parser reads name");
  assert(xmlItems[0].barcode === "123456", "XML parser reads barcode");

  // 3) Excel/CSV mapping
  console.log("\n3) Excel/CSV mapping");
  const rows = [{ barcode: "999", sku: "S1", name: "Excel Ürün", brand: "B1", category: "K1", price: "50", stock: "10" }];
  const mapped = mapRowsToItems(rows);
  assert(mapped.length === 1, "Excel mapper finds 1 product");
  assert(mapped[0].price === 50, "Excel mapper parses price");

  // 4) Admin CRUD — catalog + package
  console.log("\n4) Admin CRUD");
  const catalog = await prisma.productCatalog.create({
    data: { name: "Test Elektronik", slug: `${TEST_PREFIX}elektronik`, status: "ACTIVE" },
  });
  assert(!!catalog.id, "Catalog created");

  const count = await bulkInsertCatalogItems(catalog.id, null, xmlItems);
  assert(count === 1, "Bulk insert 1 item");

  const pkgFree = await prisma.productPackage.create({
    data: {
      name: "Test Free Paket",
      slug: `${TEST_PREFIX}free`,
      catalogIds: JSON.stringify([catalog.id]),
      licenseLevel: "FREE",
      status: "ACTIVE",
      isFree: true,
    },
  });
  const pkgPro = await prisma.productPackage.create({
    data: {
      name: "Test Pro Paket",
      slug: `${TEST_PREFIX}pro`,
      catalogIds: JSON.stringify([catalog.id]),
      licenseLevel: "PRO",
      status: "ACTIVE",
    },
  });
  assert(!!pkgFree.id && !!pkgPro.id, "Packages created");

  let dealer = await prisma.dealer.findFirst({ where: { email: "pl-test-marketplace@enaunity.com" } });
  if (!dealer) {
    dealer = await prisma.dealer.create({
      data: {
        name: "PL Test Dealer",
        title: "PL Test Dealer",
        email: "pl-test-marketplace@enaunity.com",
        phone: "5550000000",
        company: "PL Test Dealer Ltd",
        location: "Istanbul",
        companySize: "1-10",
        markets: "TR",
        status: "active",
      },
    });
  }
  if (!dealer) throw new Error("Test dealer oluşturulamadı");

  // 5) Package access + dealer isolation
  console.log("\n5) Package access & dealer isolation");
  {
    const freeAccess = await dealerCanAccessPackage(dealer.id, pkgFree.id);
    assert(freeAccess.ok, "Dealer can access FREE package (default tier)");

    const proAccess = await dealerCanAccessPackage(dealer.id, pkgPro.id);
    const tier = await getDealerLibraryTier(dealer.id);
    if (tier === "FREE") {
      assert(!proAccess.ok, "FREE tier dealer denied PRO package");
    } else {
      assert(typeof proAccess.ok === "boolean", "Higher tier dealer check runs");
    }

    const accessible = await getAccessiblePackages(dealer.id);
    assert(accessible.every((p) => canAccessPackageLevel(tier, p.licenseLevel as any)), "Accessible packages respect tier");
  }

  // 6) Export formats
  console.log("\n6) Download/export infrastructure");
  const items = await prisma.productCatalogItem.findMany({ where: { catalogId: catalog.id } });
  const xmlExport = exportPackageItems(items, "XML");
  const csvExport = exportPackageItems(items, "CSV");
  const xlsxExport = exportPackageItems(items, "EXCEL");
  assert(xmlExport.extension === "xml", "XML export ready");
  assert(csvExport.extension === "csv", "CSV export ready");
  assert(xlsxExport.extension === "xlsx", "Excel export ready");
  assert((xmlExport.body as string).includes("Test Ürün"), "XML export contains product");

  // 7) Template + recipe engine
  console.log("\n7) Recipe engine");
  const template = resolvePackageTemplate(pkgFree, items);
  assert(template.fieldRules.some((r) => r.key === "barcode" && r.behavior === "PREFIX"), "Default barcode prefix rule exists");
  const preview = buildRecipePreview({
    items,
    fieldRules: template.fieldRules,
    recipeValues: {
      barcode: { prefix: "ENA-" },
      brand: { value: "ENA Marka" },
      salePrice: { formulaType: "MULTIPLY", formulaValue: 1.2 },
    },
  });
  assert(preview.itemCount === 1, "Recipe preview row count matches");
  assert(String(preview.sampleRows[0].barcode).startsWith("ENA-"), "Recipe applies barcode prefix");
  assert(preview.sampleRows[0].brand === "ENA Marka", "Recipe applies brand replace");

  // 8) Package source preview + commit
  console.log("\n8) Package import wizard");
  const uploadBuffer = itemsToXlsxBuffer([
    { barcode: "555", sku: "S-555", name: "Upload Ürün", brand: "Upload", category: "Dekor", price: 120, salePrice: 110, stock: 8, vatRate: 20 },
  ]);
  const importPreview = await previewPackageSourceImport({
    sourceType: "EXCEL",
    fileName: "pl-test-upload.xlsx",
    buffer: uploadBuffer,
  });
  assert(importPreview.itemCount === 1, "Package import preview sees one item");
  const committed = await commitPackageSourceImport({
    sourceType: "EXCEL",
    fileName: "pl-test-upload.xlsx",
    buffer: uploadBuffer,
    packageMode: "NEW",
    packageName: "pl-test-import-package",
    description: "test upload package",
    createdBy: "pl-test@enaunity.com",
    isFree: true,
    billingType: "FREE",
    exportFormats: ["EXCEL", "XML"],
  });
  assert(!!committed.version.id, "Package version created");
  assert(!!committed.version.sourcePath, "Source file saved");
  const committedPackage = await prisma.productPackage.findUnique({ where: { id: committed.package.id } });
  assert(committedPackage?.currentVersionId === committed.version.id, "Current version pointer updated");

  // 9) Marketplace queue
  console.log("\n9) Marketplace queue");
  const recipe = await prisma.productPackageRecipe.create({
    data: {
      packageId: pkgFree.id,
      dealerId: dealer.id,
      connectionId: "",
      name: "pl-test-recipe",
      storeName: "Test Store",
      format: "XML",
      valuesJson: JSON.stringify({ brand: { value: "ENA Test" }, barcode: { prefix: "ENA-" } }),
    },
  });
  const connection = await prisma.marketplaceConnection.create({
    data: {
      dealerId: dealer.id,
      platform: "TRENDYOL",
      sellerId: `${TEST_PREFIX}seller`,
      storeId: `${TEST_PREFIX}store`,
      supplierId: "",
      apiKey: "test-api-key",
      apiSecret: "test-secret",
      connectionStatus: "CONNECTED",
      active: true,
    },
  });
  await prisma.productPackageRecipe.update({
    where: { id: recipe.id },
    data: { connectionId: connection.id, connectionLabel: "TRENDYOL / Test Store" },
  });
  assert(resolveMarketplacePanelUrl("TRENDYOL").includes("trendyol"), "Marketplace panel URL resolved");
  const uploadJob = await createMarketplaceUploadJob({
    dealerId: dealer.id,
    packageId: pkgFree.id,
    recipeId: recipe.id,
  });
  assert(uploadJob.status === "PENDING", "Marketplace upload job created");
  assert(!!uploadJob.fileName && uploadJob.fileSize > 0, "Marketplace upload artifact saved");
  const claimedJobs = await claimMarketplaceUploadJobs({
    dealerId: dealer.id,
    connectionId: connection.id,
    claimedBy: "pl-test-connector",
    limit: 5,
  });
  assert(claimedJobs.length === 1 && claimedJobs[0].status === "PROCESSING", "Marketplace job claimed by connector");
  const uploadedFile = await loadMarketplaceJobFile(uploadJob.id, dealer.id);
  assert(uploadedFile.file.byteLength > 0, "Marketplace job file can be loaded");
  const completedJob = await completeMarketplaceUploadJob({
    dealerId: dealer.id,
    jobId: uploadJob.id,
    success: true,
    result: { uploadedCount: 1 },
  });
  assert(completedJob.status === "COMPLETED", "Marketplace job completion recorded");

  // 10) THYRONIX prep field
  console.log("\n10) THYRONIX readiness field");
  const thyPkg = await prisma.productPackage.update({
    where: { id: pkgFree.id },
    data: { thyronixReady: true },
  });
  assert(thyPkg.thyronixReady === true, "thyronixReady field works");

  // 11) Import job model
  console.log("\n11) Import job records");
  const job = await prisma.productImportJob.create({
    data: {
      type: "XML",
      status: "COMPLETED",
      sourceUrl: "http://test.local/feed.xml",
      catalogId: catalog.id,
      productCount: 1,
      durationMs: 100,
      createdBy: "pl-test@enaunity.com",
      completedAt: new Date(),
    },
  });
  assert(job.status === "COMPLETED", "Import job record created");

  await cleanup();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
