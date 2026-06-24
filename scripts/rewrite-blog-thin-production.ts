/**
 * Thin blog rewrite — production workflow
 *
 * Run on server:
 *   set -a && source .env.production && set +a && \
 *   npx tsx scripts/rewrite-blog-thin-production.ts cam-tablo-grubu-cam-tablo-bayilik
 *
 * Local (with prod DATABASE_URL):
 *   set -a && source .env.production && set +a && npx tsx scripts/rewrite-blog-thin-production.ts <slug>
 */
import { prisma } from "../src/lib/db";
import { BLOG_ENGINE_VERSION, type BlogContentPayload } from "../src/lib/blog-engine/blog-types";
import { runBlogQualityCheck } from "../src/lib/blog-engine/blog-quality";
import { publishBlog } from "../src/lib/blog-engine/blog-service";
import {
  getProviderStatus,
  rewriteThinContent,
  validateGeneratedContent,
} from "../src/lib/ai-writer/ai-content-writer";
import { isPublishableAiContent } from "../src/lib/ai-writer/publish-gate";
import { auditBlog } from "../src/lib/content-quality/content-quality-service";
import {
  evaluateQualityForContent,
  queueContent,
} from "../src/lib/publishing-center/publishing-service";
import { QUALITY_THRESHOLDS } from "../src/lib/publishing-center/types";

const SLUG = process.argv[2] || "cam-tablo-grubu-cam-tablo-bayilik";
const DRY_RUN = process.argv.includes("--dry-run");

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

function contentToPlainText(content: BlogContentPayload): string {
  return [
    content.h1,
    content.intro,
    ...content.sections.map((s) => `${s.heading}\n${s.body}`),
    content.conclusion,
  ].join("\n\n");
}

async function main() {
  console.log(`\n=== Blog Thin Rewrite: ${SLUG} ===\n`);

  const provider = getProviderStatus();
  console.log("AI Writer Provider Durumu:");
  console.log(`  ready: ${provider.ready}`);
  console.log(`  activeProvider: ${provider.activeProvider ?? "—"}`);
  console.log(`  model: ${provider.model ?? "—"}`);
  console.log(`  configured: ${provider.configuredProviders.join(", ") || "—"}`);

  if (!provider.ready) {
    console.error("\n✗ AI_PROVIDER_NOT_CONFIGURED — rewrite yapılamaz.");
    process.exit(1);
  }

  const post = await prisma.blogPost.findFirst({ where: { slug: SLUG } });
  if (!post) {
    console.error(`\n✗ Blog bulunamadı: ${SLUG}`);
    process.exit(1);
  }

  console.log(`\nMevcut post: ${post.id}`);
  console.log(`  title: ${post.title}`);
  console.log(`  status: ${post.status}`);
  console.log(`  keyword: ${post.keyword}`);

  const existingContent = parseJson<BlogContentPayload>(post.contentJson, {
    version: BLOG_ENGINE_VERSION,
    h1: post.title,
    intro: post.excerpt,
    sections: [],
    conclusion: "",
  });
  const existingFaq = parseJson<Array<{ question: string; answer: string }>>(post.faqJson, []);
  const existingMeta = parseJson<Record<string, unknown>>(post.metadataJson, {});

  const backup = {
    backedUpAt: new Date().toISOString(),
    reason: "pre_rewriteThinContent_v1",
    title: post.title,
    excerpt: post.excerpt,
    contentJson: post.contentJson,
    faqJson: post.faqJson,
    schemaJson: post.schemaJson,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    internalLinksJson: post.internalLinksJson,
    qualityScore: post.qualityScore,
    seoScore: post.seoScore,
    geoScore: post.geoScore,
    originalityScore: post.originalityScore,
    status: post.status,
  };

  const plainText = contentToPlainText(existingContent);
  console.log(`\nMevcut içerik: ~${plainText.split(/\s+/).filter(Boolean).length} kelime`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Rewrite çağrılmadı.");
    process.exit(0);
  }

  console.log("\n→ rewriteThinContent çağrılıyor...");
  const rewrite = await rewriteThinContent({
    title: post.title,
    content: plainText,
    keyword: post.keyword || post.title,
    contentType: "BLOG",
  });

  if (!rewrite.success || !rewrite.data) {
    console.error(`\n✗ Rewrite başarısız: ${rewrite.error || rewrite.metadata.generationError}`);
    const failMeta = {
      ...existingMeta,
      preRewriteBackup: existingMeta.preRewriteBackup || backup,
      aiWriter: rewrite.metadata,
      rewriteFailedAt: new Date().toISOString(),
      rewriteError: rewrite.error || rewrite.metadata.generationError,
    };
    await prisma.blogPost.update({
      where: { id: post.id },
      data: {
        status: "REVIEW",
        metadataJson: JSON.stringify(failMeta),
      },
    });
    process.exit(1);
  }

  const out = rewrite.data;
  const validation = validateGeneratedContent({
    contentType: "BLOG",
    h1: out.content.h1,
    intro: out.content.intro,
    sections: out.content.sections,
    conclusion: out.content.conclusion,
    faq: out.faq,
    seoTitle: out.seoTitle,
    seoDescription: out.seoDescription,
    schema: out.schema,
    keyword: post.keyword,
  });

  const blogQuality = runBlogQualityCheck({
    content: out.content,
    faq: out.faq,
    seoTitle: out.seoTitle,
    seoDescription: out.seoDescription,
    schema: out.schema,
    keyword: post.keyword,
    originalityHint: 95,
  });

  const newMeta = {
    ...existingMeta,
    preRewriteBackup: existingMeta.preRewriteBackup || backup,
    aiWriter: rewrite.metadata,
    validationIssues: validation.issues,
    rewrittenAt: new Date().toISOString(),
    rewriteWordCount: validation.wordCount,
    thinContentRewrite: true,
  };

  await prisma.blogPost.update({
    where: { id: post.id },
    data: {
      title: out.title,
      excerpt: out.excerpt,
      contentJson: JSON.stringify(out.content),
      faqJson: JSON.stringify(out.faq),
      schemaJson: JSON.stringify(out.schema),
      seoTitle: out.seoTitle,
      seoDescription: out.seoDescription,
      qualityScore: blogQuality.qualityScore,
      seoScore: blogQuality.seoScore,
      geoScore: blogQuality.geoScore,
      originalityScore: blogQuality.originalityScore,
      status: "REVIEW",
      metadataJson: JSON.stringify(newMeta),
    },
  });

  console.log(`\n✓ İçerik güncellendi (REVIEW) — ${validation.wordCount} kelime`);
  console.log(`  AI validation: ${validation.passed ? "PASS" : "FAIL"}`);
  if (!validation.passed) console.log(`  issues: ${validation.issues.join("; ")}`);
  console.log(`  Blog quality check: ${blogQuality.passed ? "PASS" : "FAIL"}`);

  const aiGate = isPublishableAiContent(rewrite.metadata);
  console.log(`  AI publish gate: ${aiGate.publishable ? "PASS" : `FAIL (${aiGate.reason})`}`);

  console.log("\n→ İçerik Kalite Merkezi denetimi...");
  const audit = await auditBlog(post.id);
  console.log(`  audit qualityScore: ${audit.qualityScore} (eşik ${QUALITY_THRESHOLDS.qualityScore})`);
  console.log(`  audit seoScore: ${audit.seoScore} (eşik ${QUALITY_THRESHOLDS.seoScore})`);
  console.log(`  audit geoScore: ${audit.geoScore} (eşik ${QUALITY_THRESHOLDS.geoScore})`);
  console.log(`  issues: ${audit.issues.length}`);

  console.log("\n→ Publishing Center kuyruğu...");
  const queue = await queueContent({
    contentType: "BLOG",
    contentId: post.id,
    publishMode: "AUTOMATIC",
    metadata: { source: "thin_content_rewrite", slug: SLUG },
  });
  console.log(`  queue status: ${queue.status}`);

  const quality = await evaluateQualityForContent("BLOG", post.id);
  const canPublish =
    quality.suggestedStatus === "APPROVED" &&
    aiGate.publishable &&
    validation.passed &&
    blogQuality.passed;

  if (!canPublish) {
    console.log("\n⚠ APPROVED değil — yayınlanmadı.");
    console.log(`  suggestedStatus: ${quality.suggestedStatus}`);
    console.log(`  Kalite eşikleri: seo≥${QUALITY_THRESHOLDS.seoScore}, geo≥${QUALITY_THRESHOLDS.geoScore}, quality≥${QUALITY_THRESHOLDS.qualityScore}`);
    process.exit(0);
  }

  console.log("\n→ APPROVED — yayınlanıyor...");
  const published = await publishBlog(post.id);
  await prisma.publishingQueue.update({
    where: { id: queue.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  console.log(`\n✓ Yayınlandı: /blog/${published.slug}`);
  console.log(`  publishedAt: ${published.publishedAt?.toISOString()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
