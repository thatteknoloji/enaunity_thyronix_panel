/**
 * ENA_LINK_KURTARMA_MERKEZI_V1 tests
 * Run: npx tsx scripts/test-legacy-recovery.ts
 */
import { prisma } from "../src/lib/db";
import { classifyLegacyUrl } from "../src/lib/legacy-recovery/url-classifier";
import { planLegacyRecovery } from "../src/lib/legacy-recovery/recovery-planner";
import { normalizeLegacyUrl } from "../src/lib/legacy-recovery/url-normalizer";
import {
  parseCsvUrls,
  parseSitemapXml,
  parseTxtUrls,
  dedupeImportRows,
} from "../src/lib/legacy-recovery/url-importer";
import {
  importLegacyUrls,
  analyzeLegacyUrls,
  planLegacyUrls,
  getLegacyRecoveryStats,
} from "../src/lib/legacy-recovery/legacy-recovery-service";
import {
  generateLegacyRecoveries,
  getActiveLegacyGoneRules,
  getActiveLegacyRedirectRules,
  createGoneRuleManual,
  createRedirectRuleManual,
} from "../src/lib/legacy-recovery/recovery-executor";

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
const urls = [
  `/blog/cam-tablo-bayiligi-${ts}`,
  `/urun/eski-cam-tablo-${ts}`,
  `/kampanya-2020-${ts}`,
  `/kategori/cam-tablo-${ts}`,
];

async function cleanup() {
  await prisma.legacyUrl.deleteMany({
    where: { url: { contains: String(ts) } },
  });
  await prisma.legacyRedirectRule.deleteMany({
    where: { sourceUrl: { contains: String(ts) } },
  });
  await prisma.legacyGoneRule.deleteMany({
    where: { url: { contains: String(ts) } },
  });
}

try {
  console.log("\n=== ENA_LINK_KURTARMA_MERKEZI_V1 Tests ===\n");

  // Classification
  const blogC = classifyLegacyUrl("/blog/cam-tablo-bayiligi");
  assert(blogC.classification === "BLOG", "classify BLOG");

  const prodC = classifyLegacyUrl("/urun/modern-cam-tablo");
  assert(prodC.classification === "PRODUCT", "classify PRODUCT");

  const catC = classifyLegacyUrl("/kategori/cam-tablo");
  assert(catC.classification === "CATEGORY", "classify CATEGORY");

  // Recovery planning
  const blogPlan = planLegacyRecovery("/blog/cam-tablo-bayiligi", blogC);
  assert(blogPlan.strategy === "CREATE_BLOG", "plan CREATE_BLOG");

  const gonePlan = planLegacyRecovery(`/kampanya-2020-${ts}`, classifyLegacyUrl(`/kampanya-2020-${ts}`));
  assert(gonePlan.strategy === "GONE_410", "plan GONE_410");

  const prodPlan = planLegacyRecovery("/urun/eski-cam-tablo", prodC);
  assert(prodPlan.strategy === "REDIRECT_301", "plan REDIRECT_301");

  // Import parsers
  const csv = parseCsvUrls("url,lastmod\nhttps://example.com/blog/test,2024-01-01");
  assert(csv.length === 1, "CSV import");

  const txt = parseTxtUrls("/blog/a\n/blog/b");
  assert(txt.length === 2, "TXT import");

  const sitemap = parseSitemapXml(
    '<?xml version="1.0"?><urlset><url><loc>https://x.com/blog/s</loc><lastmod>2024-01-01</lastmod></url></urlset>'
  );
  assert(sitemap.length === 1, "sitemap import");

  assert(dedupeImportRows([{ url: "/a" }, { url: "/a" }]).length === 1, "dedupe");

  assert(normalizeLegacyUrl("https://Example.com/Blog/Test/") === "/blog/test", "normalize url");

  // DB import + bulk
  const imp = await importLegacyUrls({ format: "manual", urls });
  assert(imp.imported === urls.length, "URL import");

  const analyzed = await analyzeLegacyUrls({ limit: 100 });
  assert(analyzed.succeeded >= urls.length, "bulk analyze");

  const planned = await planLegacyUrls({ limit: 100 });
  assert(planned.succeeded >= urls.length, "bulk plan");

  // 301 + 410 manual
  const src = `/test-redirect-${ts}`;
  const redir = await createRedirectRuleManual(src, `/blog/target-${ts}`);
  assert(redir.sourceUrl === normalizeLegacyUrl(src), "301 creation");

  const goneUrl = `/kampanya-gone-${ts}`;
  const gone = await createGoneRuleManual(goneUrl, "test");
  assert(gone.url === normalizeLegacyUrl(goneUrl), "410 creation");

  const activeRedirects = await getActiveLegacyRedirectRules();
  assert(activeRedirects.some((r) => r.sourceUrl.includes(String(ts))), "active redirects");

  const activeGone = await getActiveLegacyGoneRules();
  assert(activeGone.some((g) => g.url.includes(String(ts))), "active gone");

  // Generate (blog + redirect + gone)
  const gen = await generateLegacyRecoveries({ limit: 50 });
  assert(gen.processed >= 1, "bulk generate processed");

  const stats = await getLegacyRecoveryStats();
  assert(stats.total >= urls.length, "stats total");

  const blogRecovered = await prisma.legacyUrl.findFirst({
    where: { url: { contains: `cam-tablo-bayiligi-${ts}` } },
  });
  if (blogRecovered?.recoveryStrategy === "CREATE_BLOG") {
    assert(!!blogRecovered.generatedBlogId, "blog recovery");
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
} finally {
  await cleanup();
  await prisma.$disconnect();
}

process.exit(failed > 0 ? 1 : 0);
