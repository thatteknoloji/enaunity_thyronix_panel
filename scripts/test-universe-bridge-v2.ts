/**
 * PRODUCT_UNIVERSE_BRIDGE_V2 tests
 * Run: npx tsx scripts/test-universe-bridge-v2.ts
 */
import { prisma } from "../src/lib/db";
import {
  previewUniverseGeneration,
  generateUniverseFromProducts,
} from "../src/lib/page-factory/universe/universe-generator-service";
import { countUniverseProducts } from "../src/lib/page-factory/universe/product-source-resolver";
import { UNIVERSE_BRIDGE_GENERATION_SOURCE } from "../src/lib/page-factory/universe/universe-types";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

async function seedProduct(ts: number, overrides: Record<string, unknown> = {}) {
  const product = await prisma.productUniverse.create({
    data: {
      sourceType: "CSV",
      rawName: `Bridge Test ${ts}`,
      normalizedName: `Bridge Test ${ts}`,
      slug: `bridge-test-${ts}`,
      brand: "BridgeMarka",
      categoryPath: "Elektronik > Aksesuar",
      descriptionClean: "Bridge test için yeterli uzunlukta açıklama metni.",
      price: 149,
      status: "ANALYZED",
      qualityScore: 82,
      metadataJson: JSON.stringify({ importJobId: `job-${ts}` }),
      ...(overrides as object),
    },
  });

  await prisma.productImage.create({
    data: {
      productId: product.id,
      sourceUrl: "https://example.com/b.jpg",
      publicUrl: "https://example.com/b.jpg",
      sortOrder: 0,
      status: "DOWNLOADED",
    },
  });

  await prisma.productEntity.create({
    data: { productId: product.id, type: "BRAND", value: "BridgeMarka", confidence: 0.9 },
  });

  return product;
}

async function cleanup(projectId: string, productIds: string[]) {
  await prisma.pageFactoryPublishedPage.deleteMany({ where: { projectId } }).catch(() => {});
  await prisma.pageFactoryBlueprint.deleteMany({ where: { projectId } });
  await prisma.pageFactoryUniverseJob.deleteMany({ where: { projectId } });
  for (const pid of productIds) {
    await prisma.productImage.deleteMany({ where: { productId: pid } });
    await prisma.productEntity.deleteMany({ where: { productId: pid } });
    await prisma.productUniverse.delete({ where: { id: pid } }).catch(() => {});
  }
  await prisma.pageFactoryProject.delete({ where: { id: projectId } }).catch(() => {});
}

console.log("\n=== PRODUCT_UNIVERSE_BRIDGE_V2 Tests ===\n");

const ts = Date.now();
const project = await prisma.pageFactoryProject.create({
  data: {
    name: `Bridge V2 Test ${ts}`,
    slug: `bridge-v2-${ts}`,
    sector: "Elektronik",
    productionType: "PRODUCT",
  },
});

const productIds: string[] = [];

try {
  // Empty universe count
  const emptyCount = await countUniverseProducts(
    { sourceType: "ALL", minQualityScore: 99, brand: "NONEXISTENT_BRAND_XYZ" },
    { isAdmin: true }
  );
  assert(emptyCount === 0, "Empty filter → totalProducts 0");

  const emptyPreview = await previewUniverseGeneration(
    { projectId: project.id, sourceType: "ALL", brand: "NONEXISTENT_BRAND_XYZ" },
    { isAdmin: true }
  );
  assert(emptyPreview.totalProducts === 0, "Empty preview → totalProducts 0");
  assert(
    emptyPreview.warnings.some((w) => w.includes("ürün bulunamadı")),
    "Empty preview → anlamlı uyarı"
  );

  // Seed 10 products
  for (let i = 0; i < 10; i++) {
    const p = await seedProduct(ts + i);
    productIds.push(p.id);
  }

  const totalCount = await countUniverseProducts({ sourceType: "ALL" }, { isAdmin: true });
  assert(totalCount >= 10, `Product Universe'de en az 10 ürün (${totalCount})`);

  const preview = await previewUniverseGeneration(
    { projectId: project.id, sourceType: "ALL", limit: 10 },
    { isAdmin: true }
  );
  assert(preview.totalProducts >= 10, "Preview totalProducts ≥ 10");
  assert(preview.sampleProducts.length > 0, "Preview örnek ürünler");
  assert(preview.sampleBlueprints.length > 0, "Preview örnek blueprintler");
  assert(preview.estimatedBlueprints > 0, "Preview tahmini blueprint > 0");

  const gen = await generateUniverseFromProducts(
    { projectId: project.id, sourceType: "ALL", limit: 3, includeGeo: false },
    { isAdmin: true }
  );
  assert(gen.generatedBlueprints > 0 || gen.updatedBlueprints > 0, "Generate gerçek ürünlerden blueprint");

  const bps = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId: project.id },
  });
  assert(bps.length > 0, "Blueprint kayıtları oluştu");

  const withSource = bps.filter((bp) => {
    try {
      const m = JSON.parse(bp.metadataJson || "{}") as { sourceProductId?: string; generationSource?: string };
      return !!m.sourceProductId && m.generationSource === UNIVERSE_BRIDGE_GENERATION_SOURCE;
    } catch {
      return false;
    }
  });
  assert(withSource.length > 0, "Blueprint metadata sourceProductId + BRIDGE_V2");

  // Duplicate run → update not new duplicates
  const beforeCount = bps.length;
  const gen2 = await generateUniverseFromProducts(
    { projectId: project.id, sourceType: "ALL", limit: 3, includeGeo: false },
    { isAdmin: true }
  );
  const afterBps = await prisma.pageFactoryBlueprint.findMany({ where: { projectId: project.id } });
  assert(afterBps.length === beforeCount, "Duplicate çalıştırma yeni blueprint açmaz");
  assert(gen2.updatedBlueprints > 0 || gen2.duplicateCount > 0, "Duplicate çalıştırma update/duplicate sayar");

  // Selected product IDs
  const selected = await generateUniverseFromProducts(
    {
      projectId: project.id,
      productIds: [productIds[0]],
      mode: "selected",
      includeGeo: false,
    },
    { isAdmin: true }
  );
  assert(selected.totalProducts === 1, "selectedProductIds ile 1 ürün");

  // Project required
  let projectError = false;
  try {
    await generateUniverseFromProducts({ projectId: "", sourceType: "ALL" }, { isAdmin: true });
  } catch (e) {
    projectError = e instanceof Error && e.message.includes("projectId");
  }
  assert(projectError, "projectId olmadan generate çalışmaz");
} finally {
  await cleanup(project.id, productIds);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
