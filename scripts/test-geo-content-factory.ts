/**
 * ENA_GEO_ICERIK_FABRIKASI_V1 tests
 * Run: npx tsx scripts/test-geo-content-factory.ts
 */
import { prisma } from "../src/lib/db";
import { slugify } from "../src/lib/utils";
import {
  getAllProvinceNames,
  getTotalDistrictCount,
  getTotalProvinceCount,
} from "../src/lib/geo/turkiye-il-ilce-kaynagi";
import { buildGeoInternalLinks, validateGeoContentText } from "../src/lib/geo-content-factory/geo-internal-links";
import {
  estimateContentCount,
  previewGeoGeneration,
  generateProvinceBlogs,
  generateDistrictBlogs,
  generateProvinceAndDistrictBlogs,
  startGeoJob,
  getGeoJobStats,
  findExistingGeoBlog,
  buildGeoTargetsForKeyword,
} from "../src/lib/geo-content-factory/geo-content-factory-service";

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

const ts = Date.now();
const testKeyword = `geo-factory-${ts}`;
const testProvinces = ["Ankara", "İzmir"];
const cleanup: { jobIds: string[]; blogIds: string[] } = { jobIds: [], blogIds: [] };

async function trackBlogs(keyword: string) {
  const posts = await prisma.blogPost.findMany({ where: { keyword }, select: { id: true } });
  for (const p of posts) cleanup.blogIds.push(p.id);
}

async function cleanupAll() {
  if (cleanup.blogIds.length) {
    await prisma.blogPost.deleteMany({ where: { id: { in: cleanup.blogIds } } }).catch(() => {});
  }
  if (cleanup.jobIds.length) {
    await prisma.geoContentJob.deleteMany({ where: { id: { in: cleanup.jobIds } } }).catch(() => {});
  }
}

try {
  console.log("\n=== ENA_GEO_ICERIK_FABRIKASI_V1 Tests ===\n");

  assert(getTotalProvinceCount() === 81, "81 il kaynağı");
  assert(getTotalDistrictCount() >= 900, "973 ilçe kaynağı (tam veri)");
  assert(getAllProvinceNames().includes("İstanbul"), "İstanbul listede");

  const provincePreview = previewGeoGeneration({
    keyword: "cam tablo bayiliği",
    mode: "PROVINCE",
  });
  assert(provincePreview.totalTargets === 81, "il modu 81 hedef");
  assert(provincePreview.sampleSlugs[0]?.includes("cam-tablo"), "örnek slug");

  const districtPreview = previewGeoGeneration({
    keyword: "cam tablo bayiliği",
    mode: "DISTRICT",
    settings: { provinces: testProvinces },
  });
  assert(districtPreview.districtCount > 0, "ilçe önizleme hedefi");
  assert(districtPreview.provinceCount === 0, "ilçe modunda il sayısı 0");

  const bothCount = estimateContentCount("cam tablo bayiliği", "PROVINCE_AND_DISTRICT", {
    provinces: testProvinces,
  });
  assert(bothCount > testProvinces.length, "il+ilçe hedef sayısı");

  const targets = buildGeoTargetsForKeyword(testKeyword, "PROVINCE", { provinces: testProvinces });
  assert(targets.length === 2, "hedef listesi (2 il)");
  assert(targets[0].slug === slugify(`${targets[0].province}-${testKeyword}`), "il slug formatı");

  const districtTargets = buildGeoTargetsForKeyword(testKeyword, "DISTRICT", {
    provinces: ["Ankara"],
  });
  assert(districtTargets.every((t) => t.scope === "DISTRICT"), "ilçe hedef scope");
  assert(
    districtTargets[0].slug === slugify(`${districtTargets[0].district}-${testKeyword}`),
    "ilçe slug formatı"
  );

  const geoText = validateGeoContentText(
    "Ankara Çankaya bölgesinde yerel ihtiyaçlar için cam tablo bayiliği rehberi",
    { province: "Ankara", district: "Çankaya" }
  );
  assert(geoText.valid, "geo validation geçerli içerik");

  const badGeo = validateGeoContentText("genel içerik", { province: "Ankara", district: "Çankaya" });
  assert(!badGeo.valid, "geo validation zayıf içerik");

  const provinceBatch = await generateProvinceBlogs({
    keyword: testKeyword,
    provinces: testProvinces,
    dryRun: true,
  });
  assert(provinceBatch.total === 2, "province generation dryRun");
  assert(provinceBatch.generated === 2, "province generation başarılı");
  await trackBlogs(testKeyword);

  const districtBatch = await generateDistrictBlogs({
    keyword: `${testKeyword}-ilce`,
    provinces: ["Ankara"],
    dryRun: true,
  });
  assert(districtBatch.total >= 20, "district generation dryRun (Ankara)");
  assert(districtBatch.generated === districtBatch.total, "district generation tamamlandı");
  await trackBlogs(`${testKeyword}-ilce`);

  const bothBatch = await generateProvinceAndDistrictBlogs({
    keyword: `${testKeyword}-both`,
    provinces: testProvinces,
    dryRun: true,
  });
  assert(bothBatch.total > 2, "province+district generation");
  await trackBlogs(`${testKeyword}-both`);

  const { job, result } = await startGeoJob({
    keyword: `${testKeyword}-job`,
    mode: "PROVINCE",
    provinces: testProvinces,
    dryRun: false,
    autoPublish: false,
  });
  cleanup.jobIds.push(job.id);
  assert(job.status === "COMPLETED", "queue creation COMPLETED");
  assert(result.generated === 2, "job üretim sayısı");
  await trackBlogs(`${testKeyword}-job`);

  const first = await findExistingGeoBlog(`${testKeyword}-job`, "Ankara", null);
  assert(!!first, "duplicate kayıt mevcut");

  const dupBatch = await generateProvinceBlogs({
    keyword: `${testKeyword}-job`,
    provinces: ["Ankara"],
    dryRun: false,
  });
  assert(dupBatch.results[0]?.updated === true, "duplicate protection update");

  const links = await buildGeoInternalLinks({
    keyword: "cam tablo bayiliği",
    province: "İstanbul",
    category: "Dekorasyon",
  });
  assert(links.relatedGeoBlogs.length >= 3, "internal links relatedGeoBlogs");
  assert(links.relatedCategoryBlogs.length >= 1, "internal links relatedCategoryBlogs");

  if (first?.id) {
    const post = await prisma.blogPost.findUnique({ where: { id: first.id } });
    const stored = post?.internalLinksJson ? JSON.parse(post.internalLinksJson) : {};
    assert(Array.isArray(stored.relatedGeoBlogs), "blog internalLinksJson relatedGeoBlogs");
  }

  const stats = await getGeoJobStats();
  assert(stats.totalProvinces === 81, "statistics totalProvinces");
  assert(stats.recentJobs.length >= 1, "statistics recentJobs");
  assert(typeof stats.successRate === "number", "statistics successRate");
} catch (err) {
  failed++;
  console.error("Fatal:", err);
} finally {
  await cleanupAll();
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}
