/**
 * PAGE_FACTORY_UNIVERSE_GENERATOR_V1 tests
 * Run: npm run test:universe-generator
 */
import { prisma } from "../src/lib/db";
import { generateBlueprintBatch } from "../src/lib/product-universe/blueprint-batch-engine";
import {
  generateUniverseForProduct,
  generateUniverseFromProducts,
  previewUniverseGeneration,
} from "../src/lib/page-factory/universe/universe-generator-service";
import { UNIVERSE_GENERATION_SOURCE, UNIVERSE_LIMITS } from "../src/lib/page-factory/universe/universe-types";

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

async function seedProduct(ts: number, projectId: string) {
  const product = await prisma.productUniverse.create({
    data: {
      sourceType: "MANUAL",
      rawName: `Universe Test Ürün ${ts}`,
      normalizedName: `Universe Test Ürün ${ts}`,
      slug: `universe-test-${ts}`,
      brand: "UnivMarka",
      categoryPath: "Elektronik > Aksesuar",
      descriptionClean: "Universe generator test için yeterli uzunlukta açıklama metni.",
      price: 199,
      status: "BLUEPRINT_READY",
      qualityScore: 85,
      projectId,
      metadataJson: JSON.stringify({ stock: 10 }),
    },
  });

  await prisma.productImage.create({
    data: {
      productId: product.id,
      sourceUrl: "https://example.com/u.jpg",
      publicUrl: "https://example.com/u.jpg",
      sortOrder: 0,
      status: "DOWNLOADED",
    },
  });

  await prisma.productEntity.create({
    data: { productId: product.id, type: "BRAND", value: "UnivMarka", confidence: 0.9 },
  });

  await prisma.productContentDNA.create({
    data: {
      productId: product.id,
      primaryEntity: `Universe Test Ürün ${ts}`,
      targetKeyword: "universe test ürün",
      intent: "commercial",
      audience: "genel",
      pageAngle: "rehber",
      faqSeedsJson: JSON.stringify(["Nasıl kullanılır?", "Uyumlu mu?"]),
      internalLinkHintsJson: "[]",
      schemaHintsJson: "[]",
    },
  });

  return product;
}

async function cleanup(projectId: string, productIds: string[]) {
  await prisma.pageFactoryBlueprint.deleteMany({ where: { projectId } });
  await prisma.pageFactoryUniverseJob.deleteMany({ where: { projectId } });
  for (const pid of productIds) {
    await prisma.productImage.deleteMany({ where: { productId: pid } });
    await prisma.productEntity.deleteMany({ where: { productId: pid } });
    await prisma.productContentDNA.deleteMany({ where: { productId: pid } });
    await prisma.productUniverse.delete({ where: { id: pid } }).catch(() => {});
  }
  await prisma.pageFactoryProject.delete({ where: { id: projectId } }).catch(() => {});
}

console.log("\n=== PAGE_FACTORY_UNIVERSE_GENERATOR_V1 Tests ===\n");

const ts = Date.now();
const project = await prisma.pageFactoryProject.create({
  data: {
    name: `Universe Gen Test ${ts}`,
    slug: `universe-gen-${ts}`,
    sector: "Elektronik",
    productionType: "PRODUCT",
  },
});

const productIds: string[] = [];

try {
  const p1 = await seedProduct(ts, project.id);
  productIds.push(p1.id);

  console.log("1 ürün → minimum 11 blueprint:");
  const single = await generateUniverseForProduct(
    p1.id,
    { projectId: project.id, includeGeo: false, mode: "full" },
    { isAdmin: true }
  );
  assert(single.generatedBlueprints >= UNIVERSE_LIMITS.minBlueprintsPerProduct, `≥${UNIVERSE_LIMITS.minBlueprintsPerProduct} blueprint`);

  const bps1 = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId: project.id, metadataJson: { contains: UNIVERSE_GENERATION_SOURCE } },
  });
  assert(bps1.length >= UNIVERSE_LIMITS.minBlueprintsPerProduct, "DB kayıt sayısı ≥11");

  const types1 = new Set(bps1.map((b) => b.pageType));
  assert(types1.has("product_detail"), "product_detail var");
  assert(types1.has("product_faq"), "product_faq var");
  assert(types1.has("product_intent"), "product_intent var");
  assert(types1.has("product_guide"), "product_guide var");
  assert(types1.has("product_benefit"), "product_benefit var");
  assert(types1.has("product_problem"), "product_problem var");

  console.log("\nDuplicate çalıştırma yeni kayıt açmamalı:");
  const countBefore = bps1.length;
  const rerun = await generateUniverseForProduct(
    p1.id,
    { projectId: project.id, includeGeo: false, mode: "full" },
    { isAdmin: true }
  );
  const countAfter = await prisma.pageFactoryBlueprint.count({
    where: { projectId: project.id, metadataJson: { contains: UNIVERSE_GENERATION_SOURCE } },
  });
  assert(countAfter === countBefore, "Duplicate run yeni kayıt açmadı");
  assert(rerun.updatedBlueprints >= 1 || rerun.generatedBlueprints >= 1, "Re-run update path");

  console.log("\nGeo blueprintler oluşmalı:");
  const geoRun = await generateUniverseForProduct(
    p1.id,
    { projectId: project.id, includeGeo: true, mode: "geo_only" },
    { isAdmin: true }
  );
  assert(geoRun.geoCount >= 20, "≥20 geo blueprint");
  const geoBps = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId: project.id, pageType: "product_geo" },
  });
  assert(geoBps.length >= 20, "DB'de geo blueprint ≥20");
  const istanbul = geoBps.find((b) => b.metadataJson.includes("İstanbul"));
  assert(!!istanbul, "İstanbul geo blueprint var");

  console.log("\nSlug çakışmaları çözülmeli:");
  const slugs = geoBps.map((b) => {
    const m = JSON.parse(b.metadataJson) as { slug?: string };
    return m.slug;
  });
  const uniqueSlugs = new Set(slugs);
  assert(uniqueSlugs.size === slugs.length, "Tüm geo slug'lar benzersiz");

  console.log("\n10 ürün → minimum 110 blueprint:");
  await prisma.pageFactoryBlueprint.deleteMany({ where: { projectId: project.id } });
  for (let i = 0; i < 9; i++) {
    const p = await seedProduct(ts + i + 1, project.id);
    productIds.push(p.id);
  }
  const batch = await generateUniverseFromProducts(
    { projectId: project.id, includeGeo: false, limit: 10, minQualityScore: 0 },
    { isAdmin: true }
  );
  assert(batch.totalProducts === 10, "10 ürün işlendi");
  assert(batch.generatedBlueprints >= 110, "≥110 blueprint üretildi");

  console.log("\nPreview:");
  const preview = await previewUniverseGeneration(
    { projectId: project.id, includeGeo: false, limit: 1 },
    { isAdmin: true }
  );
  assert(preview.estimatedBlueprints >= UNIVERSE_LIMITS.minBlueprintsPerProduct, "Preview tahmin ≥11");

  console.log(`\n=== Sonuç: ${passed} passed, ${failed} failed ===\n`);
  await cleanup(project.id, productIds);
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  await cleanup(project.id, productIds).catch(() => {});
  process.exit(1);
}
