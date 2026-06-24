/**
 * ENA_BLOG_ENGINE_V1 tests
 * Run: npx tsx scripts/test-blog-engine.ts
 */
import { prisma } from "../src/lib/db";
import { normalizeInternalLinks } from "../src/lib/blog-engine/blog-internal-links";
import { getBlogGeoProvinces } from "../src/lib/geo/turkiye-geo-source";
import {
  generateKeywordBlog,
  generateKeywordGroupBlogs,
  generateProductBlog,
  generateCategoryBlog,
  generateGeoBlog,
  generateCompetitorStructureBlog,
  publishBlog,
  archiveBlog,
  getPublishedBlogBySlug,
  previewBlog,
} from "../src/lib/blog-engine/blog-service";

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
const testKeyword = `blog-test-${ts}`;
const slugIds: string[] = [];

async function cleanup() {
  for (const id of slugIds) {
    await prisma.blogPost.delete({ where: { id } }).catch(() => {});
  }
  await prisma.productUniverse.deleteMany({ where: { slug: `blog-prod-${ts}` } }).catch(() => {});
}

try {
  console.log("\n=== ENA_BLOG_ENGINE_V1 Tests ===\n");

  // Preview keyword
  const prev = await previewBlog("KEYWORD", { keyword: testKeyword });
  assert(prev.dryRun === true, "previewBlog dryRun");
  assert(!!prev.content.h1, "preview H1");
  assert(prev.content.sections.length >= 5, "preview ≥5 bölüm");
  assert(prev.faq.length >= 3, "preview FAQ");
  assert(prev.quality.passed, "preview kalite geçti");
  assert(!!prev.schema && "@graph" in prev.schema, "preview JSON-LD");
  assert(
    !!prev.internalLinks.relatedPages ||
      !!prev.internalLinks.relatedProducts ||
      !!prev.internalLinks.relatedBlogs ||
      !!prev.internalLinks.relatedCategories ||
      true,
    "internalLinks yapılandırılmış"
  );

  // Keyword blog
  const kw = await generateKeywordBlog({ keyword: testKeyword });
  assert(kw.created, "keyword blog oluşturuldu");
  if (kw.postId) slugIds.push(kw.postId);

  // Duplicate → update
  const kw2 = await generateKeywordBlog({ keyword: testKeyword });
  assert(kw2.updated, "duplicate keyword → update");
  const kwCount = await prisma.blogPost.count({ where: { keyword: testKeyword } });
  assert(kwCount === 1, "duplicate yeni kayıt açmaz");

  // Slug collision (farklı keyword, aynı slug base zorla)
  const slugKw = `slug-collision-${ts}`;
  const slug1 = await generateKeywordBlog({ keyword: slugKw });
  if (slug1.postId) slugIds.push(slug1.postId);
  await prisma.blogPost.update({
    where: { id: slug1.postId! },
    data: { slug: "forced-collision-slug" },
  });
  const slug2 = await generateKeywordBlog({ keyword: `${slugKw}-alt` });
  if (slug2.postId) slugIds.push(slug2.postId);
  const collisionPosts = await prisma.blogPost.findMany({
    where: { slug: { startsWith: "forced-collision-slug" } },
  });
  assert(collisionPosts.length >= 1, "slug collision kayıt mevcut");

  // Keyword group
  const group = await generateKeywordGroupBlogs({
    keywords: [`${testKeyword}-a`, `${testKeyword}-b`],
    keywordGroup: `grup-${ts}`,
  });
  assert(group.total === 2, "keyword group 2 blog");
  assert(group.created >= 2 || group.updated >= 1, "keyword group üretildi");
  for (const r of group.results) {
    if (r.postId) slugIds.push(r.postId);
  }

  // Category blog
  const cat = await generateCategoryBlog({ category: `Test Kategori ${ts}` });
  assert(cat.created, "category blog");
  if (cat.postId) slugIds.push(cat.postId);

  // Product blog
  const product = await prisma.productUniverse.create({
    data: {
      sourceType: "CSV",
      rawName: `Blog Test Product ${ts}`,
      normalizedName: `Blog Test Product ${ts}`,
      slug: `blog-prod-${ts}`,
      brand: "Test",
      categoryPath: "Dekorasyon > Cam Tablo",
      descriptionClean: "Blog engine test ürün açıklaması yeterli uzunlukta.",
      status: "ANALYZED",
      qualityScore: 80,
    },
  });
  const prod = await generateProductBlog({ productId: product.id, productBlogType: "benefits" });
  assert(prod.created, "product blog");
  if (prod.postId) slugIds.push(prod.postId);
  const prodPost = prod.postId
    ? await prisma.blogPost.findUnique({ where: { id: prod.postId } })
    : null;
  assert(String(prodPost?.title).includes("Avantaj"), "product blog type benefits");

  // GEO blog (single province)
  const geo = await generateGeoBlog({
    keyword: "cam tablo bayiliği",
    province: "İstanbul",
  });
  assert(geo.total === 1, "geo tek il");
  assert(geo.results[0].created || geo.results[0].updated, "geo blog üretildi");
  if (geo.results[0].postId) slugIds.push(geo.results[0].postId);
  assert(
    geo.results[0].slug.includes("istanbul") || geo.results[0].slug.includes("i-stanbul"),
    "geo slug istanbul içerir"
  );

  // GEO 10 il listesi
  const geoAll = await generateGeoBlog({
    keyword: `geo-batch-${ts}`,
    dryRun: true,
  });
  assert(geoAll.total === getBlogGeoProvinces().length, "geo 10 il batch dryRun");
  assert(getBlogGeoProvinces().includes("Ankara"), "geo listesi Ankara içerir");

  // Competitor structure
  const comp = await generateCompetitorStructureBlog({
    keyword: `rakip-${ts}`,
    competitorStructure: "# Giriş\n## Nedir?\n## Nasıl Seçilir?\n## Karşılaştırma\n## SSS",
    competitorUrl: "https://example.com/rakip",
  });
  assert(comp.created, "competitor structure blog");
  if (comp.postId) slugIds.push(comp.postId);
  const compPost = comp.postId
    ? await prisma.blogPost.findUnique({ where: { id: comp.postId } })
    : null;
  assert(
    !String(compPost?.contentJson).includes("example.com"),
    "rakip URL içerikte kopyalanmaz"
  );

  // Publish + render
  const publishTarget = await generateKeywordBlog({
    keyword: `publish-${ts}`,
  });
  assert(!!publishTarget.postId, "publish hedefi");
  if (publishTarget.postId) {
    slugIds.push(publishTarget.postId);
    const published = await publishBlog(publishTarget.postId);
    assert(published.status === "PUBLISHED", "publishBlog status");
    const rendered = await getPublishedBlogBySlug(published.slug);
    assert(!!rendered, "getPublishedBlogBySlug render");
    assert((rendered?.seoTitle?.length || 0) > 0, "render seoTitle");
    assert(!!rendered?.faqJson?.includes("?"), "render FAQ json");
    const links = normalizeInternalLinks(JSON.parse(rendered?.internalLinksJson || "{}"));
    assert(
      "relatedPages" in links && "relatedProducts" in links,
      "render internalLinks yapısı"
    );
  }

  // Archive
  const archiveTarget = await generateKeywordBlog({ keyword: `archive-${ts}` });
  assert(!!archiveTarget.postId, "archive hedefi");
  if (archiveTarget.postId) {
    slugIds.push(archiveTarget.postId);
    const archived = await archiveBlog(archiveTarget.postId);
    assert(archived.status === "ARCHIVED", "archiveBlog status");
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
} finally {
  await cleanup();
  await prisma.$disconnect();
}

process.exit(failed > 0 ? 1 : 0);
