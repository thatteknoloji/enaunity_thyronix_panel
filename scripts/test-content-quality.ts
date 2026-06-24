/**
 * ENA_ICERIK_KALITE_MERKEZI_V1 tests
 * Run: npx tsx scripts/test-content-quality.ts
 */
import { prisma } from "../src/lib/db";
import { runContentAudit } from "../src/lib/content-quality/audit-engine";
import {
  auditBlog,
  auditPage,
  auditProduct,
  auditRecoveryPage,
  auditAll,
  getAuditReport,
  getRecommendations,
  recalculateScores,
  listIssues,
} from "../src/lib/content-quality/content-quality-service";
import { generateKeywordBlog } from "../src/lib/blog-engine/blog-service";

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
const ids: { blog?: string; product?: string; legacy?: string } = {};

async function cleanup() {
  if (ids.blog) {
    await prisma.contentQualityAudit.deleteMany({ where: { contentId: ids.blog } }).catch(() => {});
    await prisma.blogPost.delete({ where: { id: ids.blog } }).catch(() => {});
  }
  if (ids.product) {
    await prisma.contentQualityAudit.deleteMany({ where: { contentId: ids.product } }).catch(() => {});
    await prisma.productUniverse.delete({ where: { id: ids.product } }).catch(() => {});
  }
  if (ids.legacy) {
    await prisma.contentQualityAudit.deleteMany({ where: { contentId: ids.legacy } }).catch(() => {});
    await prisma.legacyUrl.delete({ where: { id: ids.legacy } }).catch(() => {});
  }
}

try {
  console.log("\n=== ENA_ICERIK_KALITE_MERKEZI_V1 Tests ===\n");

  // Audit engine — issue detection + score calculation
  const goodAudit = runContentAudit({
    contentType: "BLOG",
    contentId: "test",
    title: "Cam Tablo Bayiliği Rehberi",
    metaTitle: "Cam Tablo Bayiliği — Kapsamlı Rehber | ENA",
    metaDescription: "Cam tablo bayiliği hakkında kapsamlı rehber. SEO, GEO ve AEO odaklı özgün içerik ile bayilik fırsatlarını keşfedin.",
    h1: "Cam Tablo Bayiliği Rehberi",
    keyword: "cam tablo bayiliği",
    province: "İstanbul",
    bodyText: "Cam tablo bayiliği İstanbul bölgesinde popüler bir iş fırsatıdır. ".repeat(20),
    h2Count: 6,
    faq: [
      { question: "Cam tablo bayiliği nedir?", answer: "Franchise modelidir." },
      { question: "Nasıl başlanır?", answer: "Başvuru ile." },
      { question: "Fiyatlar?", answer: "Değişken." },
    ],
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "BlogPosting", headline: "Test" },
        { "@type": "FAQPage", mainEntity: [] },
      ],
    },
    internalLinks: { blogs: 2, pages: 1, products: 2 },
    canonical: "https://enaunity.com/blog/test",
  });
  assert(goodAudit.qualityScore > 50, "score calculation good content");
  assert(goodAudit.seoScore > 50, "seo score");
  assert(goodAudit.aeoScore >= 60, "aeo score with FAQ");
  assert(goodAudit.issues.length < 3, "few issues for good content");

  const badAudit = runContentAudit({
    contentType: "BLOG",
    contentId: "bad",
    title: "X",
    metaTitle: "",
    metaDescription: "",
    h1: "",
    bodyText: "kısa",
    h2Count: 0,
    faq: [],
    schema: null,
    internalLinks: { blogs: 0, pages: 0, products: 0 },
  });
  assert(badAudit.issues.some((i) => i.type === "MISSING_META"), "issue MISSING_META");
  assert(badAudit.issues.some((i) => i.type === "MISSING_FAQ"), "issue MISSING_FAQ");
  assert(badAudit.issues.some((i) => i.type === "MISSING_SCHEMA"), "issue MISSING_SCHEMA");
  assert(badAudit.issues.some((i) => i.type === "LOW_CONTENT"), "issue LOW_CONTENT");
  assert(badAudit.recommendations.length > 0, "recommendation üretimi");

  // Blog audit integration
  const blog = await generateKeywordBlog({ keyword: `kalite-test-${ts}` });
  assert(blog.created, "blog oluşturuldu");
  if (blog.postId) {
    ids.blog = blog.postId;
    const blogAudit = await auditBlog(blog.postId);
    assert(blogAudit.contentType === "BLOG", "blog audit type");
    assert(blogAudit.qualityScore > 0, "blog audit score");
    const stored = await prisma.contentQualityAudit.findUnique({
      where: { contentType_contentId: { contentType: "BLOG", contentId: blog.postId } },
    });
    assert(!!stored, "blog audit persisted");
  }

  // Product audit
  const product = await prisma.productUniverse.create({
    data: {
      sourceType: "CSV",
      rawName: `Kalite Test ${ts}`,
      normalizedName: `Kalite Test ${ts}`,
      slug: `kalite-prod-${ts}`,
      brand: "Test",
      categoryPath: "Test",
      descriptionClean: "Bu ürün kalite testi için yeterli uzunlukta bir açıklama metni içerir.",
      status: "ANALYZED",
      qualityScore: 70,
    },
  });
  ids.product = product.id;
  const prodAudit = await auditProduct(product.id);
  assert(prodAudit.contentType === "PRODUCT", "product audit");
  assert(prodAudit.qualityScore > 0, "product audit score");

  // Recovery audit (ungenerated)
  const legacy = await prisma.legacyUrl.create({
    data: {
      url: `/blog/kalite-recovery-${ts}`,
      normalizedUrl: `/blog/kalite-recovery-${ts}`,
      source: "test",
      status: "PLANNED",
      classification: "BLOG",
      recoveryStrategy: "CREATE_BLOG",
    },
  });
  ids.legacy = legacy.id;
  const recAudit = await auditRecoveryPage(legacy.id);
  assert(recAudit.contentType === "RECOVERY_PAGE", "recovery audit");
  assert(recAudit.recommendations.some((r) => r.id === "generate-recovery"), "recovery recommendation");

  // Page audit — skip if no drafts
  const draft = await prisma.pageFactoryContentDraft.findFirst();
  if (draft) {
    const pageAudit = await auditPage(draft.id);
    assert(pageAudit.contentType === "PAGE", "page audit");
    await prisma.contentQualityAudit.deleteMany({ where: { contentId: draft.id } }).catch(() => {});
  } else {
    assert(true, "page audit skipped (no drafts)");
  }

  // Bulk + report
  const bulk = await auditAll({ limit: 5 });
  assert(bulk.processed >= 1, "auditAll processed");

  const report = await getAuditReport();
  assert(report.totalContent >= 1, "audit report total");
  assert(typeof report.avgSeo === "number", "audit report avgSeo");

  const recs = await getRecommendations({ limit: 10 });
  assert(Array.isArray(recs), "getRecommendations");

  const issues = await listIssues({ limit: 10 });
  assert(Array.isArray(issues), "listIssues");

  if (ids.blog) {
    const recalc = await recalculateScores({ contentType: "BLOG" });
    assert(recalc.processed >= 1, "recalculateScores");
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
} finally {
  await cleanup();
  await prisma.$disconnect();
}

process.exit(failed > 0 ? 1 : 0);
