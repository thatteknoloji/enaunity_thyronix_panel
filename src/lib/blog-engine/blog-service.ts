import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { BlogPost, BlogPostStatus, BlogSourceType } from "@prisma/client";
import {
  buildCategoryContent,
  buildCompetitorStructureContent,
  buildFaqItems,
  buildGeoContent,
  buildKeywordContent,
  buildProductContent,
  buildSchemaJson,
  buildSeoDescription,
  buildSeoTitle,
  extractCompetitorStructure,
} from "./blog-content-builder";
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
  faq: ReturnType<typeof buildFaqItems>;
  tags: string[];
  sourceJson: Record<string, unknown>;
  originalityHint: number;
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
  const seoTitle = buildSeoTitle(built.title, built.keyword);
  const seoDescription = buildSeoDescription(built.content.intro, built.keyword);
  const internalLinks = await suggestInternalLinks({
    keyword: built.keyword,
    category: built.category,
    province: built.province,
    productId: built.sourceReferenceId,
    excludeSlug: slug,
  });
  const quality = runBlogQualityCheck({
    content: built.content,
    faq: built.faq,
    seoTitle,
    seoDescription,
    province: built.province,
    originalityHint: built.originalityHint,
  });
  const schema = buildSchemaJson({
    title: built.title,
    description: seoDescription,
    slug,
    faq: built.faq,
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
  const status: BlogPostStatus = opts.autoPublish ? "PUBLISHED" : "DRAFT";
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
  const content = buildKeywordContent(keyword);
  return {
    title: content.h1,
    slugBase: slugify(keyword),
    keyword,
    keywordGroup: opts.keywordGroup || null,
    category: opts.category || null,
    sourceType: "KEYWORD",
    content,
    faq: buildFaqItems(keyword, "KEYWORD"),
    tags: opts.tags || [keyword, "rehber", "seo"],
    sourceJson: { keyword, mode: "KEYWORD" },
    originalityHint: 90,
  };
}

async function buildKeywordGroupBuilt(opts: BlogGenerateOptions): Promise<BuiltPost[]> {
  const keywords = opts.keywords?.length ? opts.keywords : opts.keyword ? [opts.keyword] : [];
  if (!keywords.length) throw new Error("keywords veya keyword gerekli");
  const group = opts.keywordGroup || keywords.join(", ");
  return keywords.map((kw) => {
    const content = buildKeywordContent(kw.trim());
    return {
      title: content.h1,
      slugBase: slugify(`${group}-${kw}`),
      keyword: kw.trim(),
      keywordGroup: group,
      sourceType: "KEYWORD_GROUP" as BlogSourceType,
      content,
      faq: buildFaqItems(kw, "KEYWORD_GROUP"),
      tags: opts.tags || [kw, group, "keyword-group"],
      sourceJson: { keyword: kw, keywordGroup: group, mode: "KEYWORD_GROUP" },
      originalityHint: 88,
    };
  });
}

async function buildProductBlogBuilt(opts: BlogGenerateOptions): Promise<BuiltPost> {
  const productId = opts.productId;
  if (!productId) throw new Error("productId gerekli");
  const product = await prisma.productUniverse.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Ürün bulunamadı");
  const categoryLabel = product.categoryPath.split(/[>/|]/).pop()?.trim() || product.categoryPath;
  const content = buildProductContent(product.normalizedName, categoryLabel);
  return {
    title: content.h1,
    slugBase: `urun-${product.slug || slugify(product.normalizedName)}`,
    keyword: product.normalizedName,
    category: categoryLabel,
    sourceType: "PRODUCT",
    sourceReferenceId: product.id,
    content,
    faq: buildFaqItems(product.normalizedName, "PRODUCT", 6),
    tags: opts.tags || [product.normalizedName, categoryLabel, "ürün"],
    sourceJson: { productId: product.id, productName: product.normalizedName },
    originalityHint: 92,
  };
}

async function buildCategoryBlogBuilt(opts: BlogGenerateOptions): Promise<BuiltPost> {
  const category = (opts.category || "").trim();
  if (!category) throw new Error("category gerekli");
  const content = buildCategoryContent(category);
  return {
    title: content.h1,
    slugBase: `kategori-${slugify(category)}`,
    keyword: category,
    category,
    sourceType: "CATEGORY",
    content,
    faq: buildFaqItems(category, "CATEGORY"),
    tags: opts.tags || [category, "kategori"],
    sourceJson: { category, mode: "CATEGORY" },
    originalityHint: 87,
  };
}

async function buildGeoBlogBuilt(opts: BlogGenerateOptions): Promise<BuiltPost[]> {
  const keyword = (opts.keyword || opts.category || "").trim();
  if (!keyword) throw new Error("keyword gerekli (GEO modu)");
  const provinces = opts.province ? [opts.province] : [...BLOG_GEO_PROVINCES];
  return provinces.map((province) => {
    const content = buildGeoContent(keyword, province, opts.district);
    const loc = opts.district ? `${province}-${opts.district}` : province;
    return {
      title: content.h1,
      slugBase: slugify(`${loc}-${keyword}`),
      keyword,
      province,
      district: opts.district || null,
      sourceType: "GEO" as BlogSourceType,
      content,
      faq: buildFaqItems(`${loc} ${keyword}`, "GEO"),
      tags: opts.tags || [keyword, province, "geo"],
      sourceJson: { keyword, province, district: opts.district, mode: "GEO" },
      originalityHint: 86,
    };
  });
}

async function buildCompetitorBlogBuilt(opts: BlogGenerateOptions): Promise<BuiltPost> {
  const structureInput = (opts.competitorStructure || "").trim();
  if (!structureInput) throw new Error("competitorStructure gerekli");
  const keyword = (opts.keyword || "konu").trim();
  const structure = extractCompetitorStructure(structureInput);
  const content = buildCompetitorStructureContent(keyword, structure);
  return {
    title: content.h1,
    slugBase: slugify(`${keyword}-rehber`),
    keyword,
    sourceType: "COMPETITOR_STRUCTURE",
    content,
    faq: buildFaqItems(keyword, "COMPETITOR_STRUCTURE", structure.hasFaq ? 6 : 5),
    tags: opts.tags || [keyword, "rakip-yapı", "özgün"],
    sourceJson: {
      competitorUrl: opts.competitorUrl || null,
      extractedHeadings: structure.headings,
      mode: "COMPETITOR_STRUCTURE",
      note: "Yalnızca yapı ilham alındı — içerik özgün",
    },
    originalityHint: 95,
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
  const [total, drafts, review, published, archived] = await Promise.all([
    prisma.blogPost.count(),
    prisma.blogPost.count({ where: { status: "DRAFT" } }),
    prisma.blogPost.count({ where: { status: "REVIEW" } }),
    prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
    prisma.blogPost.count({ where: { status: "ARCHIVED" } }),
  ]);
  return { total, drafts, review, published, archived };
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
