/**
 * ENA_BLOG_ENGINE_SEO_INDEX_INTERNAL_LINK_V1 tests
 * Run: npx tsx scripts/test-blog-seo-index.ts
 */
import { prisma } from "../src/lib/db";
import {
  getBlogDirectoryData,
  listBlogsByCategory,
  listBlogsByProvince,
  listBlogsByTag,
  searchBlogPosts,
  categoryToSlug,
  resolveProvinceFromSlug,
} from "../src/lib/blog-engine/blog-directory-service";
import {
  resolveRelatedBlogs,
  resolveRelatedProducts,
  resolveRelatedPages,
  resolveRelatedContentForPost,
} from "../src/lib/blog-engine/blog-related-service";
import {
  buildBlogPostingSchema,
  buildBreadcrumbSchema,
  buildBlogPostMetadata,
  blogAbsoluteUrl,
} from "../src/lib/blog-engine/blog-seo";
import { slugify } from "../src/lib/utils";
import { getBlogHealthReport, runBlogHealthCheck } from "../src/lib/blog-engine/blog-health-service";
import { generateKeywordBlog, generateGeoBlog, publishBlog } from "../src/lib/blog-engine/blog-service";
import { getBlogGeoProvinces } from "../src/lib/geo/turkiye-geo-source";

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
const ids: string[] = [];

async function cleanup() {
  for (const id of ids) {
    await prisma.blogPost.delete({ where: { id } }).catch(() => {});
  }
}

try {
  console.log("\n=== ENA_BLOG_ENGINE_SEO_INDEX_V1 Tests ===\n");

  const catName = `SEO Kategori ${ts}`;
  const tagName = `seo-tag-${ts}`;
  const keyword = `seo-index-${ts}`;

  const post = await generateKeywordBlog({
    keyword,
    category: catName,
    tags: [tagName, "rehber"],
  });
  assert(post.created, "test blog oluşturuldu");
  if (post.postId) {
    ids.push(post.postId);
    await publishBlog(post.postId);
    await prisma.blogPost.update({
      where: { id: post.postId },
      data: { category: catName, tagsJson: JSON.stringify([tagName, "rehber"]) },
    });
  }

  const geoBatch = await generateGeoBlog({
    keyword: `geo-${ts}`,
    province: "İstanbul",
  });
  if (geoBatch.results[0]?.postId) {
    ids.push(geoBatch.results[0].postId);
    await publishBlog(geoBatch.results[0].postId);
  }

  // Directory
  const dir = await getBlogDirectoryData(1, 6);
  assert(dir.recent.items.length >= 1, "blog directory recent");
  assert(Array.isArray(dir.categories), "blog directory categories");
  assert(Array.isArray(dir.geoHubs), "blog directory geo hubs");
  assert(dir.geoHubs.some((g) => g.name === "İstanbul"), "geo hub İstanbul");

  // Category landing
  const catSlug = categoryToSlug(catName);
  const catList = await listBlogsByCategory(catSlug, 1, 10);
  assert(catList.category === catName, "category landing eşleşme");
  assert(catList.total >= 1, "category landing count");

  // GEO landing
  const geoList = await listBlogsByProvince("istanbul", 1, 10);
  assert(geoList.province === "İstanbul", "geo landing province resolve");
  assert(geoList.total >= 1, "geo landing count");

  const resolved = await resolveProvinceFromSlug("ankara");
  assert(resolved === "Ankara", "resolveProvinceFromSlug Ankara");

  // Tag landing
  const tagList = await listBlogsByTag(slugify(tagName), 1, 10);
  assert(tagList.tag === tagName, "tag landing eşleşme");
  assert(tagList.total >= 1, "tag landing count");

  // Search
  const search = await searchBlogPosts(keyword, 1, 10);
  assert(search.total >= 1, "search title/keyword");
  assert(search.items[0].title.length > 0, "search sonuç başlık");

  const tagSearch = await searchBlogPosts(tagName, 1, 10);
  assert(tagSearch.total >= 1, "search tags");

  // Related engines
  const fullPost = await prisma.blogPost.findFirst({ where: { keyword } });
  assert(!!fullPost, "full post loaded");

  if (fullPost) {
    const relatedBlogs = await resolveRelatedBlogs(fullPost, 6);
    assert(relatedBlogs.length <= 6, "related blogs max 6");

    const relatedProducts = await resolveRelatedProducts(fullPost, 8);
    assert(relatedProducts.length <= 8, "related products max 8");

    const relatedPages = await resolveRelatedPages(fullPost, 8);
    assert(relatedPages.length <= 8, "related pages max 8");

    const related = await resolveRelatedContentForPost(fullPost);
    assert("relatedBlogs" in related, "related content structure");
    assert("relatedProducts" in related, "related products field");
    assert("relatedPages" in related, "related pages field");
  }

  // Breadcrumb + JSON-LD
  const breadcrumbs = buildBreadcrumbSchema([
    { name: "Ana Sayfa", href: "/" },
    { name: "Blog", href: "/blog" },
    { name: "Makale" },
  ]);
  assert(breadcrumbs["@type"] === "BreadcrumbList", "breadcrumb JSON-LD");

  if (fullPost) {
    const schema = buildBlogPostingSchema({ post: fullPost, faq: [] });
    const graph = schema["@graph"] as Array<{ "@type": string }>;
    assert(graph.some((g) => g["@type"] === "BlogPosting"), "BlogPosting JSON-LD");

    const meta = buildBlogPostMetadata(fullPost);
    assert(!!meta.alternates?.canonical, "canonical meta");
    assert(!!meta.openGraph?.title, "open graph title");
    assert(!!meta.twitter?.title, "twitter card title");
    assert(String(meta.alternates?.canonical).includes(fullPost.slug), "canonical slug");
  }

  assert(blogAbsoluteUrl("/blog").startsWith("http"), "blog absolute url");

  // Health service
  if (fullPost) {
    const health = runBlogHealthCheck(fullPost);
    assert(health.postId === fullPost.id, "health check postId");
    assert(typeof health.healthy === "boolean", "health healthy flag");
  }

  const report = await getBlogHealthReport({ limit: 20 });
  assert(report.checked >= 1, "health report checked");
  assert(typeof report.avgSeoScore === "number", "health avg seo");
  assert(typeof report.avgGeoScore === "number", "health avg geo");
  assert(typeof report.avgQualityScore === "number", "health avg quality");

  assert(getBlogGeoProvinces().length === 10, "10 il GEO listesi");

  console.log(`\n${passed} passed, ${failed} failed\n`);
} finally {
  await cleanup();
  await prisma.$disconnect();
}

process.exit(failed > 0 ? 1 : 0);
