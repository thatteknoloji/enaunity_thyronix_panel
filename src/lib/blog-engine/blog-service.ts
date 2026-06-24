import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { BlogPost, BlogPostStatus, BlogSourceType } from "@prisma/client";
import type { BlogFaqItem } from "./blog-types";
import {
  buildSchemaJson,
  buildSeoDescription,
  buildSeoTitle,
  extractCompetitorStructure,
} from "./blog-content-builder";
import { resolveAiBlogContent } from "./blog-ai-bridge";
import type { AiWriterMetadata } from "@/lib/ai-writer/types";
import { suggestInternalLinks } from "./blog-internal-links";
import { runBlogQualityCheck } from "./blog-quality";
import { ensureUniqueBlogSlug } from "./blog-slug";
import {
  BLOG_ENGINE_VERSION,
  BLOG_GEO_PROVINCES,
  type BlogBatchGenerateResult,
  type BlogContentPayload,
  type BlogGenerateOptions,
  type BlogGenerateResult,
  type BlogPreviewResult,
} from "./blog-types";
import { getBlogGeoProvinces } from "@/lib/geo/turkiye-geo-source";

type BuiltPost = {
  title: string;
  slugBase: string;
  keyword: string;
  keywordGroup?: string | null;
  province?: string | null;
  district?: string | null;
  category?: string | null;
  sourceType: BlogSourceType;
  sourceReferenceId?: string | null;
  content: BlogContentPayload;
  faq: BlogFaqItem[];
  tags: string[];
  sourceJson: Record<string, unknown>;
  originalityHint: number;
  aiMetadata?: AiWriterMetadata;
  aiSuccess?: boolean;
  seoTitleOverride?: string;
  seoDescriptionOverride?: string;
  schemaOverride?: Record<string, unknown>;
};

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

async function findDuplicatePost(opts: {
  keyword: string;
  province?: string | null;
  district?: string | null;
  sourceReferenceId?: string | null;
}) {
  return prisma.blogPost.findFirst({
    where: {
      keyword: opts.keyword,
      province: opts.province || null,
      district: opts.district || null,
      sourceReferenceId: opts.sourceReferenceId || null,
    },
  });
}

async function buildPostPayload(built: BuiltPost, opts: BlogGenerateOptions): Promise<{
  preview: Omit<BlogPreviewResult, "dryRun">;
}> {
  const slug = await ensureUniqueBlogSlug(built.slugBase);
  const seoTitle = built.seoTitleOverride || buildSeoTitle(built.title, built.keyword);
  const seoDescription =
    built.seoDescriptionOverride || buildSeoDescription(built.content.intro, built.keyword);
  const internalLinks = await suggestInternalLinks({
    keyword: built.keyword,
    category: built.category,
    province: built.province,
    productId: built.sourceReferenceId,
    projectId: opts.projectId,
    excludeSlug: slug,
  });
  const schema =
    built.schemaOverride ||
    buildSchemaJson({
      title: built.title,
      description: seoDescription,
      slug,
      faq: built.faq,
    });
  const quality = runBlogQualityCheck({
    content: built.content,
    faq: built.faq,
    seoTitle,
    seoDescription,
    schema,
    keyword: built.keyword,
    province: built.province,
    originalityHint: built.originalityHint,
  });

  return {
    preview: {
      title: built.title,
      slug,
      excerpt: built.content.intro.slice(0, 200),
      content: built.content,
      faq: built.faq,
      schema,
      internalLinks,
      seoTitle,
      seoDescription,
      quality,
      sourceType: built.sourceType,
    },
  };
}

async function persistPost(
  built: BuiltPost,
  preview: Omit<BlogPreviewResult, "dryRun">,
  opts: BlogGenerateOptions,
  existing?: BlogPost | null
): Promise<BlogGenerateResult> {
  const aiOk = built.aiSuccess !== false;
  let status: BlogPostStatus = "DRAFT";
  if (!aiOk) {
    status = "REVIEW";
  } else if (opts.autoPublish && preview.quality.passed) {
    status = "PUBLISHED";
  } else if (!preview.quality.passed) {
    status = "REVIEW";
  }

  const data = {
    projectId: opts.projectId || null,
    dealerId: opts.dealerId || null,
    sourceType: built.sourceType,
    sourceReferenceId: built.sourceReferenceId || null,
    title: preview.title,
    slug: preview.slug,
    keyword: built.keyword,
    keywordGroup: built.keywordGroup || null,
    province: built.province || null,
    district: built.district || null,
    category: built.category || null,
    tagsJson: JSON.stringify(built.tags),
    excerpt: preview.excerpt,
    contentJson: JSON.stringify(preview.content),
    faqJson: JSON.stringify(preview.faq),
    schemaJson: JSON.stringify(preview.schema),
    internalLinksJson: JSON.stringify(preview.internalLinks),
    seoTitle: preview.seoTitle,
    seoDescription: preview.seoDescription,
    status,
    originalityScore: preview.quality.originalityScore,
    seoScore: preview.quality.seoScore,
    geoScore: preview.quality.geoScore,
    qualityScore: preview.quality.qualityScore,
    sourceJson: JSON.stringify(built.sourceJson),
    metadataJson: JSON.stringify({
      version: BLOG_ENGINE_VERSION,
      qualityChecks: preview.quality.checks,
      warnings: preview.quality.warnings,
      aiWriter: built.aiMetadata || null,
      validationIssues: built.aiMetadata?.validationIssues || [],
    }),
    publishedAt: status === "PUBLISHED" ? new Date() : null,
  };

  if (opts.dryRun) {
    return {
      dryRun: true,
      created: !existing,
      updated: !!existing,
      slug: preview.slug,
      title: preview.title,
      status,
      quality: preview.quality,
      warnings: preview.quality.warnings,
    };
  }

  if (!aiOk) {
    // Provider hatası — REVIEW olarak kaydet, yayınlama
  } else if (!preview.quality.passed && status !== "REVIEW") {
    throw new Error(`Kalite kontrolü geçmedi: ${preview.quality.warnings.join(", ")}`);
  }

  let post: BlogPost;
  if (existing) {
    const uniqueSlug = await ensureUniqueBlogSlug(preview.slug, existing.id);
    post = await prisma.blogPost.update({
      where: { id: existing.id },
      data: { ...data, slug: uniqueSlug },
    });
    return {
      dryRun: false,
      created: false,
      updated: true,
      postId: post.id,
      slug: post.slug,
      title: post.title,
      status: post.status,
      quality: preview.quality,
      warnings: preview.quality.warnings,
    };
  }

  post = await prisma.blogPost.create({ data });
  return {
    dryRun: false,
    created: true,
    updated: false,
    postId: post.id,
    slug: post.slug,
    title: post.title,
    status: post.status,
    quality: preview.quality,
    warnings: preview.quality.warnings,
  };
}

async function generateFromBuilt(
  built: BuiltPost,
  opts: BlogGenerateOptions
): Promise<BlogGenerateResult> {
  const existing = await findDuplicatePost({
    keyword: built.keyword,
    province: built.province,
    district: built.district,
    sourceReferenceId: built.sourceReferenceId,
  });
  const { preview } = await buildPostPayload(built, opts);
  if (existing && !opts.dryRun) {
    preview.slug = await ensureUniqueBlogSlug(preview.slug, existing.id);
  }
  return persistPost(built, preview, opts, existing);
}

export async function previewBlog(
  sourceType: BlogSourceType,
  opts: BlogGenerateOptions
): Promise<BlogPreviewResult> {
  const wrappers = await generateBySource(sourceType, opts);
  const list = Array.isArray(wrappers) ? wrappers : [wrappers];
  const { preview } = await buildPostPayload(list[0].built, { ...opts, dryRun: true });
  return { dryRun: true, ...preview };
}

type BuiltWrapper = { built: BuiltPost };

async function generateBySource(
  sourceType: BlogSourceType,
  opts: BlogGenerateOptions
): Promise<BuiltWrapper | BuiltWrapper[]> {
  switch (sourceType) {
    case "KEYWORD":
      return { built: await buildKeywordBlogBuilt(opts) };
    case "KEYWORD_GROUP":
      return (await buildKeywordGroupBuilt(opts)).map((b) => ({ built: b }));
    case "PRODUCT":
      return { built: await buildProductBlogBuilt(opts) };
    case "CATEGORY":
      return { built: await buildCategoryBlogBuilt(opts) };
    case "GEO":
      return (await buildGeoBlogBuilt(opts)).map((b) => ({ built: b }));
    case "COMPETITOR_STRUCTURE":
      return { built: await buildCompetitorBlogBuilt(opts) };
    default:
      throw new Error(`Desteklenmeyen kaynak tipi: ${sourceType}`);
  }
}

async function buildKeywordBlogBuilt(opts: BlogGenerateOptions): Promise<BuiltPost> {
  const keyword = (opts.keyword || "").trim();
  if (!keyword) throw new Error("keyword gerekli");
  const ai = await resolveAiBlogContent({
    keyword,
    sourceType: "KEYWORD",
    category: opts.category,
    debugTemplateFallback: opts.debugTemplateFallback,
  });
  return {
    title: ai.title,
    slugBase: slugify(keyword),
    keyword,
    keywordGroup: opts.keywordGroup || null,
    category: opts.category || null,
    sourceType: "KEYWORD",
    content: ai.content,
    faq: ai.faq,
    tags: opts.tags || [keyword, "rehber", "seo"],
    sourceJson: { keyword, mode: "KEYWORD", aiWriter: true },
    originalityHint: ai.aiSuccess ? 95 : 30,
    aiMetadata: ai.aiMetadata,
    aiSuccess: ai.aiSuccess,
    seoTitleOverride: ai.seoTitle,
    seoDescriptionOverride: ai.seoDescription,
    schemaOverride: ai.schema,
  };
}

async function buildKeywordGroupBuilt(opts: BlogGenerateOptions): Promise<BuiltPost[]> {
  const keywords = opts.keywords?.length ? opts.keywords : opts.keyword ? [opts.keyword] : [];
  if (!keywords.length) throw new Error("keywords veya keyword gerekli");
  const group = opts.keywordGroup || keywords.join(", ");
  const results: BuiltPost[] = [];
  for (const kw of keywords) {
    const ai = await resolveAiBlogContent({
      keyword: kw.trim(),
      sourceType: "KEYWORD_GROUP",
      category: opts.category,
      debugTemplateFallback: opts.debugTemplateFallback,
    });
    results.push({
      title: ai.title,
      slugBase: slugify(`${group}-${kw}`),
      keyword: kw.trim(),
      keywordGroup: group,
      sourceType: "KEYWORD_GROUP",
      content: ai.content,
      faq: ai.faq,
      tags: opts.tags || [kw, group, "keyword-group"],
      sourceJson: { keyword: kw, keywordGroup: group, mode: "KEYWORD_GROUP", aiWriter: true },
      originalityHint: ai.aiSuccess ? 93 : 30,
      aiMetadata: ai.aiMetadata,
      aiSuccess: ai.aiSuccess,
      seoTitleOverride: ai.seoTitle,
      seoDescriptionOverride: ai.seoDescription,
      schemaOverride: ai.schema,
    });
  }
  return results;
}

async function buildProductBlogBuilt(opts: BlogGenerateOptions): Promise<BuiltPost> {
  const productId = opts.productId;
  if (!productId) throw new Error("productId gerekli");
  const product = await prisma.productUniverse.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Ürün bulunamadı");
  const categoryLabel = product.categoryPath.split(/[>/|]/).pop()?.trim() || product.categoryPath;
  const blogType = opts.productBlogType || "usage";
  const ai = await resolveAiBlogContent({
    keyword: product.normalizedName,
    sourceType: "PRODUCT",
    category: categoryLabel,
    productName: product.normalizedName,
    debugTemplateFallback: opts.debugTemplateFallback,
  });
  const typeSlug = blogType === "usage" ? "kullanim" : blogType;
  return {
    title: ai.title,
    slugBase: `urun-${product.slug || slugify(product.normalizedName)}-${typeSlug}`,
    keyword: product.normalizedName,
    category: categoryLabel,
    sourceType: "PRODUCT",
    sourceReferenceId: product.id,
    content: ai.content,
    faq: ai.faq,
    tags: opts.tags || [product.normalizedName, categoryLabel, "ürün"],
    sourceJson: { productId: product.id, productName: product.normalizedName, productBlogType: blogType, aiWriter: true },
    originalityHint: ai.aiSuccess ? 95 : 30,
    aiMetadata: ai.aiMetadata,
    aiSuccess: ai.aiSuccess,
    seoTitleOverride: ai.seoTitle,
    seoDescriptionOverride: ai.seoDescription,
    schemaOverride: ai.schema,
  };
}

async function buildCategoryBlogBuilt(opts: BlogGenerateOptions): Promise<BuiltPost> {
  const category = (opts.category || "").trim();
  if (!category) throw new Error("category gerekli");
  const ai = await resolveAiBlogContent({
    keyword: category,
    sourceType: "CATEGORY",
    category,
    debugTemplateFallback: opts.debugTemplateFallback,
  });
  return {
    title: ai.title,
    slugBase: `kategori-${slugify(category)}`,
    keyword: category,
    category,
    sourceType: "CATEGORY",
    content: ai.content,
    faq: ai.faq,
    tags: opts.tags || [category, "kategori"],
    sourceJson: { category, mode: "CATEGORY", aiWriter: true },
    originalityHint: ai.aiSuccess ? 92 : 30,
    aiMetadata: ai.aiMetadata,
    aiSuccess: ai.aiSuccess,
    seoTitleOverride: ai.seoTitle,
    seoDescriptionOverride: ai.seoDescription,
    schemaOverride: ai.schema,
  };
}

async function buildGeoBlogBuilt(opts: BlogGenerateOptions): Promise<BuiltPost[]> {
  const keyword = (opts.keyword || opts.category || "").trim();
  if (!keyword) throw new Error("keyword gerekli (GEO modu)");
  const provinces = opts.province ? [opts.province] : getBlogGeoProvinces();
  const slugMode = opts.geoSlugMode || (opts.district ? "DISTRICT" : "PROVINCE");

  if (opts.province && opts.district) {
    return [await buildSingleGeoPost(keyword, opts)];
  }

  if (opts.province && !opts.district && slugMode === "DISTRICT") {
    return [];
  }

  const posts: BuiltPost[] = [];
  for (const province of provinces) {
    posts.push(await buildSingleGeoPost(keyword, { ...opts, province, district: opts.district }));
  }
  return posts;
}

async function buildSingleGeoPost(keyword: string, opts: BlogGenerateOptions): Promise<BuiltPost> {
  const province = opts.province || "";
  const district = opts.district || null;
  const slugMode = opts.geoSlugMode || (district ? "DISTRICT" : "PROVINCE");
  const ai = await resolveAiBlogContent({
    keyword,
    sourceType: "GEO",
    province,
    district,
    category: opts.category,
    debugTemplateFallback: opts.debugTemplateFallback,
  });
  const slugBase =
    slugMode === "DISTRICT" && district
      ? slugify(`${district}-${keyword}`)
      : slugify(`${province}-${keyword}`);

  return {
    title: ai.title,
    slugBase,
    keyword,
    keywordGroup: opts.keywordGroup || null,
    province,
    district,
    category: opts.category || null,
    sourceType: "GEO",
    content: ai.content,
    faq: ai.faq,
    tags: opts.tags || [keyword, province, ...(district ? [district] : []), "geo"],
    sourceJson: {
      keyword,
      province,
      district,
      mode: "GEO",
      geoSlugMode: slugMode,
      factory: "ENA_GEO_ICERIK_FABRIKASI_V1",
      aiWriter: true,
    },
    originalityHint: ai.aiSuccess ? 90 : 30,
    aiMetadata: ai.aiMetadata,
    aiSuccess: ai.aiSuccess,
    seoTitleOverride: ai.seoTitle,
    seoDescriptionOverride: ai.seoDescription,
    schemaOverride: ai.schema,
  };
}

async function buildCompetitorBlogBuilt(opts: BlogGenerateOptions): Promise<BuiltPost> {
  const structureInput = (opts.competitorStructure || "").trim();
  if (!structureInput) throw new Error("competitorStructure gerekli");
  const keyword = (opts.keyword || "konu").trim();
  const structure = extractCompetitorStructure(structureInput);
  const ai = await resolveAiBlogContent({
    keyword,
    sourceType: "COMPETITOR_STRUCTURE",
    competitorStructure: structureInput,
    competitorUrl: opts.competitorUrl,
    debugTemplateFallback: opts.debugTemplateFallback,
  });
  return {
    title: ai.title,
    slugBase: slugify(`${keyword}-rehber`),
    keyword,
    sourceType: "COMPETITOR_STRUCTURE",
    content: ai.content,
    faq: ai.faq,
    tags: opts.tags || [keyword, "rakip-yapı", "özgün"],
    sourceJson: {
      competitorUrl: opts.competitorUrl || null,
      extractedHeadings: structure.headings,
      mode: "COMPETITOR_STRUCTURE",
      note: "Yalnızca yapı ilham alındı — içerik özgün",
      aiWriter: true,
    },
    originalityHint: ai.aiSuccess ? 96 : 30,
    aiMetadata: ai.aiMetadata,
    aiSuccess: ai.aiSuccess,
    seoTitleOverride: ai.seoTitle,
    seoDescriptionOverride: ai.seoDescription,
    schemaOverride: ai.schema,
  };
}

export async function generateKeywordBlog(opts: BlogGenerateOptions): Promise<BlogGenerateResult> {
  const built = await buildKeywordBlogBuilt(opts);
  return generateFromBuilt(built, opts);
}

export async function generateKeywordGroupBlogs(opts: BlogGenerateOptions): Promise<BlogBatchGenerateResult> {
  const builtList = await buildKeywordGroupBuilt(opts);
  const results: BlogGenerateResult[] = [];
  for (const built of builtList) {
    results.push(await generateFromBuilt(built, opts));
  }
  return {
    dryRun: !!opts.dryRun,
    results,
    total: results.length,
    created: results.filter((r) => r.created).length,
    updated: results.filter((r) => r.updated).length,
    warnings: results.flatMap((r) => r.warnings),
  };
}

export async function generateProductBlog(opts: BlogGenerateOptions): Promise<BlogGenerateResult> {
  const built = await buildProductBlogBuilt(opts);
  return generateFromBuilt(built, opts);
}

export async function generateCategoryBlog(opts: BlogGenerateOptions): Promise<BlogGenerateResult> {
  const built = await buildCategoryBlogBuilt(opts);
  return generateFromBuilt(built, opts);
}

export async function generateGeoBlog(opts: BlogGenerateOptions): Promise<BlogBatchGenerateResult> {
  const builtList = await buildGeoBlogBuilt(opts);
  const results: BlogGenerateResult[] = [];
  for (const built of builtList) {
    results.push(await generateFromBuilt(built, opts));
  }
  return {
    dryRun: !!opts.dryRun,
    results,
    total: results.length,
    created: results.filter((r) => r.created).length,
    updated: results.filter((r) => r.updated).length,
    warnings: results.flatMap((r) => r.warnings),
  };
}

export async function generateCompetitorStructureBlog(opts: BlogGenerateOptions): Promise<BlogGenerateResult> {
  const built = await buildCompetitorBlogBuilt(opts);
  return generateFromBuilt(built, opts);
}

export async function publishBlog(postId: string): Promise<BlogPost> {
  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Blog bulunamadı");
  const content = parseJson<BlogContentPayload>(post.contentJson, {
    version: BLOG_ENGINE_VERSION,
    h1: post.title,
    intro: post.excerpt,
    sections: [],
    conclusion: "",
  });
  const faq = parseJson<Array<{ question: string; answer: string }>>(post.faqJson, []);
  const quality = runBlogQualityCheck({
    content: content as BlogContentPayload,
    faq,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    schema: parseJson<Record<string, unknown>>(post.schemaJson, {}),
    keyword: post.keyword,
    province: post.province,
    originalityHint: post.originalityScore,
  });
  if (!quality.passed) {
    throw new Error(`Kalite kontrolü geçmedi: ${quality.warnings.join(", ")}`);
  }
  return prisma.blogPost.update({
    where: { id: postId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      qualityScore: quality.qualityScore,
      seoScore: quality.seoScore,
      geoScore: quality.geoScore,
      originalityScore: quality.originalityScore,
    },
  });
}

export async function archiveBlog(postId: string): Promise<BlogPost> {
  return prisma.blogPost.update({
    where: { id: postId },
    data: { status: "ARCHIVED" },
  });
}

export async function getBlogDashboardStats() {
  const [total, drafts, review, published, archived, posts, categories, geoCount] =
    await Promise.all([
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { status: "DRAFT" } }),
      prisma.blogPost.count({ where: { status: "REVIEW" } }),
      prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
      prisma.blogPost.count({ where: { status: "ARCHIVED" } }),
      prisma.blogPost.findMany({
        select: { seoScore: true, geoScore: true, qualityScore: true },
      }),
      prisma.blogPost.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ["category"],
      }),
      prisma.blogPost.count({
        where: { status: "PUBLISHED", province: { not: null } },
      }),
    ]);

  const n = posts.length || 1;
  const avgSeoScore = Math.round(posts.reduce((s, p) => s + p.seoScore, 0) / n);
  const avgGeoScore = Math.round(posts.reduce((s, p) => s + p.geoScore, 0) / n);
  const avgQualityScore = Math.round(posts.reduce((s, p) => s + p.qualityScore, 0) / n);

  return {
    total,
    drafts,
    review,
    published,
    archived,
    categoryCount: categories.length,
    geoCount,
    avgSeoScore,
    avgGeoScore,
    avgQualityScore,
  };
}

export async function listBlogPosts(filters: {
  status?: BlogPostStatus;
  sourceType?: BlogSourceType;
  page?: number;
  limit?: number;
  q?: string;
}) {
  const page = filters.page || 1;
  const limit = Math.min(100, filters.limit || 20);
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q } },
            { keyword: { contains: filters.q } },
            { slug: { contains: filters.q } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPublishedBlogBySlug(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
}

export { parseJson };
