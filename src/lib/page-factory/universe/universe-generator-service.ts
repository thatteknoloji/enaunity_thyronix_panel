import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { ProductContentDNA } from "@prisma/client";
import {
  UNIVERSE_BRIDGE_GENERATION_SOURCE,
  UNIVERSE_LEGACY_GENERATION_SOURCE,
  UNIVERSE_LIMITS,
  UNIVERSE_PRE_BRIDGE_SOURCE,
  UNIVERSE_VERSION,
  type UniverseBlueprintDraft,
  type UniverseEstimateResult,
  type UniverseGenerateResult,
  type UniverseGeneratorFilters,
  type UniverseGenerationMode,
  type UniversePreviewResult,
  type UniverseProductSourceFilters,
  type UniverseSourceType,
} from "./universe-types";
import {
  normalizeProductForUniverse,
  resolveUniverseProducts,
  countUniverseProducts,
  toProductSample,
  type UniverseProductBundle,
} from "./product-source-resolver";
import { runPipelineForUniverseJob } from "./universe-pipeline-service";
import {
  getGeoCatalogCounts,
  resolveUniverseGeoNodes,
  type UniverseGeoNode,
} from "./universe-geo-resolver";
import {
  buildCategoryVariant,
  matchProductCategories,
  resolveIndustryCategories,
  resolveVariantsForMode,
  type ProductVariantSpec,
} from "./universe-variant-resolver";

const HIERARCHY: Record<string, number> = {
  product_geo: 1,
  product_category: 2,
  product_intent: 2,
  product_faq: 2,
  product_guide: 2,
  product_benefit: 2,
  product_problem: 2,
  product_comparison: 2,
  product_alternative: 2,
  product_detail: 4,
};

function parseJsonArray(json: string): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function getProductStock(product: UniverseProductBundle): number | null {
  try {
    const meta = JSON.parse(product.metadataJson || "{}") as { stock?: number };
    if (typeof meta.stock === "number") return meta.stock;
  } catch {
    /* ignore */
  }
  const stockAttr = product.attributes.find((a) => a.key === "stock");
  if (stockAttr) {
    const n = parseInt(stockAttr.value, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function shouldNoindex(product: UniverseProductBundle): boolean {
  if (product.qualityScore < 70) return true;
  if (product.duplicateGroupId) return true;
  if (!product.descriptionClean?.trim()) return true;
  if (!product.images.length) return true;
  if (!product.entities.length) return true;
  return false;
}

function computePriorityScore(product: UniverseProductBundle): number {
  let score = product.qualityScore;
  if (product.images.length) score += 5;
  if (product.descriptionClean.length > 30) score += 5;
  const stock = getProductStock(product);
  if (stock != null && stock > 0) score += 5;
  if (!shouldNoindex(product)) score += 5;
  return Math.min(100, score);
}

function truncateSlug(slug: string): string {
  if (slug.length <= UNIVERSE_LIMITS.maxSlugLength) return slug;
  return slug.slice(0, UNIVERSE_LIMITS.maxSlugLength).replace(/-+$/, "");
}

function uniqueSlug(base: string, existing: Set<string>): string {
  let slug = truncateSlug(slugify(base) || "sayfa");
  let n = 0;
  while (existing.has(slug)) {
    n += 1;
    slug = truncateSlug(`${slugify(base)}-${n}`);
  }
  existing.add(slug);
  return slug;
}

function buildDupKey(productId: string, pageType: string, variantKey: string): string {
  return `${productId}:${pageType}:${variantKey}`;
}

function buildMetadata(
  product: UniverseProductBundle,
  draft: UniverseBlueprintDraft,
  jobId?: string,
  sourceTypeFilter?: UniverseSourceType
): Record<string, unknown> {
  const seed = normalizeProductForUniverse(product);
  const dna = product.contentDNA;
  const stock = getProductStock(product);
  const imageUrls = product.images.map((i) => i.publicUrl || i.sourceUrl).filter(Boolean);
  const categoryLabel = product.categoryPath.split(/[>/|]/).pop()?.trim() || product.categoryPath;

  return {
    generationSource: UNIVERSE_BRIDGE_GENERATION_SOURCE,
    universeVersion: UNIVERSE_VERSION,
    universeJobId: jobId || null,
    createdByUniverseJobId: jobId || null,
    sourceProductId: seed.productId,
    sourceType: seed.sourceType,
    universeSourceFilter: sourceTypeFilter || "ALL",
    universeType: draft.pageType,
    blueprintType: draft.blueprintKind,
    blueprintKind: draft.blueprintKind,
    targetIntent: draft.intent,
    geoTarget: draft.geoTarget,
    autoPipelineEligible: true,
    productUniverseId: seed.productUniverseId,
    productId: seed.productId,
    productName: seed.productName,
    brand: seed.brand,
    category: seed.category,
    categoryPath: seed.category,
    sku: seed.sku,
    importJobId: seed.importJobId,
    barcode: product.barcode,
    price: product.price,
    stock,
    imageUrls,
    contentDNA: dna
      ? {
          primaryEntity: dna.primaryEntity,
          targetKeyword: dna.targetKeyword,
          intent: dna.intent,
          audience: dna.audience,
          pageAngle: dna.pageAngle,
        }
      : null,
    qualityScore: product.qualityScore,
    faqSeeds: parseJsonArray(dna?.faqSeedsJson || "[]"),
    noindexRecommended: shouldNoindex(product),
    universeVariantKey: draft.variantKey,
    contentStatus: "NOT_GENERATED",
    status: "DRAFT",
    slug: draft.slug,
    targetQuery: draft.targetQuery,
    intent: draft.intent,
    priorityScore: draft.priorityScore,
    province: draft.metadata?.province || null,
    region: draft.metadata?.region || null,
    geoPath: draft.metadata?.geoPath || null,
    clusterPath: draft.metadata?.clusterPath || `Product > ${categoryLabel}`,
  };
}

function resolveVariantsForProduct(
  baseVariants: ProductVariantSpec[],
  product: UniverseProductBundle,
  categoryCatalog: Array<{ id: string; name: string; slug: string; industryName: string }>
): ProductVariantSpec[] {
  const matched = matchProductCategories(product.categoryPath, categoryCatalog);
  const categoryVariants =
    matched.length > 0
      ? matched.map((c) => buildCategoryVariant(c, product.normalizedName))
      : product.categoryPath?.trim()
        ? [
            buildCategoryVariant(
              { id: "product-path", name: product.categoryPath.split(/[>/|]/).pop()?.trim() || product.categoryPath, slug: slugify(product.categoryPath) },
              product.normalizedName
            ),
          ]
        : [];
  return [...baseVariants, ...categoryVariants];
}

function geoTitle(geo: UniverseGeoNode, productName: string): string {
  if (geo.level === "province") return `${geo.name} ${productName}`;
  if (geo.level === "district") return `${geo.provinceName} ${geo.name} ${productName}`;
  return `${geo.name} ${productName}`;
}

function buildDraftsForProduct(
  product: UniverseProductBundle,
  mode: UniverseGenerationMode,
  includeGeo: boolean,
  slugSet: Set<string>,
  variants: ProductVariantSpec[],
  geoNodes: UniverseGeoNode[]
): UniverseBlueprintDraft[] {
  const drafts: UniverseBlueprintDraft[] = [];
  const name = product.normalizedName;
  const priorityScore = computePriorityScore(product);
  const categoryLabel = product.categoryPath.split(/[>/|]/).pop()?.trim() || product.categoryPath;

  for (const spec of variants) {
    const slugBase = spec.slugSuffix ? `${product.slug}-${spec.slugSuffix}` : product.slug;
    const slug = uniqueSlug(slugBase, slugSet);
    const title = spec.pageType === "product_category" ? spec.titleSuffix || categoryLabel : `${name}${spec.titleSuffix}`;

    drafts.push({
      productId: product.id,
      productName: name,
      pageType: spec.pageType,
      blueprintKind: spec.blueprintKind,
      variantKey: spec.variantKey,
      title,
      slug,
      targetQuery: spec.targetQueryTemplate(name, categoryLabel),
      intent: spec.intent,
      geoTarget: null,
      priorityScore,
      qualityScore: product.qualityScore,
      metadata: {
        province: null,
        region: null,
        geoPath: null,
        clusterPath: `Product > ${categoryLabel}`,
        intentId: spec.intentId || null,
        categoryId: spec.categoryId || null,
      },
    });
  }

  if ((mode === "full" || mode === "geo_only" || mode === "selected") && includeGeo) {
    for (const geo of geoNodes) {
      const slug = uniqueSlug(`${product.slug}-${geo.slug}`, slugSet);
      drafts.push({
        productId: product.id,
        productName: name,
        pageType: "product_geo",
        blueprintKind: "PRODUCT_GEO",
        variantKey: geo.slug,
        title: geoTitle(geo, name),
        slug,
        targetQuery: `${geo.path.replace(/>/g, " ").toLowerCase()} ${name.toLowerCase()}`,
        intent: "local",
        geoTarget: geo.path,
        priorityScore,
        qualityScore: product.qualityScore,
        metadata: {
          province: geo.provinceName || geo.name,
          region: geo.provinceName || null,
          geoPath: geo.path,
          geoLevel: geo.level,
          geoId: geo.id,
          clusterPath: `Product > ${categoryLabel} > GEO > ${geo.path}`,
        },
      });
    }
  }

  return drafts;
}

async function loadExistingBlueprintMap(projectId: string): Promise<Map<string, string>> {
  const all = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId },
    select: { id: true, pageType: true, metadataJson: true },
  });
  const map = new Map<string, string>();
  for (const bp of all) {
    try {
      const m = JSON.parse(bp.metadataJson || "{}") as {
        productId?: string;
        productUniverseId?: string;
        sourceProductId?: string;
        universeVariantKey?: string;
        slug?: string;
      };
      const pid = m.productUniverseId || m.sourceProductId || m.productId;
      if (!pid) continue;
      const variant = m.universeVariantKey || "default";
      map.set(buildDupKey(pid, bp.pageType, variant), bp.id);
      if (m.slug) {
        map.set(`${pid}:${bp.pageType}:${m.slug}`, bp.id);
      }
    } catch {
      /* skip */
    }
  }
  return map;
}

async function loadExistingSlugs(projectId: string): Promise<Set<string>> {
  const all = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId },
    select: { metadataJson: true },
  });
  const slugs = new Set<string>();
  for (const bp of all) {
    try {
      const m = JSON.parse(bp.metadataJson || "{}") as { slug?: string };
      if (m.slug) slugs.add(m.slug);
    } catch {
      /* skip */
    }
  }
  return slugs;
}

function countByType(drafts: UniverseBlueprintDraft[]) {
  const byPageType: Record<string, number> = {};
  let geoCount = 0;
  let intentCount = 0;
  let faqCount = 0;
  let categoryCount = 0;
  for (const d of drafts) {
    byPageType[d.pageType] = (byPageType[d.pageType] || 0) + 1;
    if (d.pageType === "product_geo") geoCount += 1;
    if (d.pageType === "product_intent") intentCount += 1;
    if (d.pageType === "product_faq") faqCount += 1;
    if (d.pageType === "product_category") categoryCount += 1;
  }
  return { byPageType, geoCount, intentCount, faqCount, categoryCount };
}

type UniverseContext = {
  baseVariants: ProductVariantSpec[];
  geoNodes: UniverseGeoNode[];
  categoryCatalog: Array<{ id: string; name: string; slug: string; industryName: string }>;
  geoCatalog: Awaited<ReturnType<typeof getGeoCatalogCounts>>;
};

async function loadUniverseContext(
  filters: UniverseGeneratorFilters,
  mode: UniverseGenerationMode,
  includeGeo: boolean
): Promise<UniverseContext> {
  const [baseVariants, geoNodes, categoryCatalog, geoCatalog] = await Promise.all([
    resolveVariantsForMode(mode, includeGeo),
    includeGeo && (mode === "full" || mode === "geo_only" || mode === "selected")
      ? resolveUniverseGeoNodes({
          geoLevel: filters.geoLevel || "province",
          geoLimit: filters.geoLimit,
          provinceIds: filters.provinceIds,
          districtIds: filters.districtIds,
          neighborhoodIds: filters.neighborhoodIds,
          villageIds: filters.villageIds,
        })
      : Promise.resolve([]),
    resolveIndustryCategories(),
    getGeoCatalogCounts(),
  ]);
  return { baseVariants, geoNodes, categoryCatalog, geoCatalog };
}

export async function estimateUniverseSize(
  productCount: number,
  filters: Pick<
    UniverseGeneratorFilters,
    "mode" | "includeGeo" | "geoLevel" | "geoLimit" | "provinceIds" | "districtIds" | "neighborhoodIds" | "villageIds"
  > & { sampleCategoryPath?: string }
): Promise<UniverseEstimateResult> {
  const mode = filters.mode || "full";
  const includeGeo =
    mode === "geo_only" ? true : filters.includeGeo !== false && mode !== "faq_only";
  const ctx = await loadUniverseContext(
    { ...filters, projectId: "", mode, includeGeo } as UniverseGeneratorFilters,
    mode,
    includeGeo
  );

  const sampleVariants = filters.sampleCategoryPath
    ? resolveVariantsForProduct(ctx.baseVariants, { categoryPath: filters.sampleCategoryPath } as UniverseProductBundle, ctx.categoryCatalog)
    : ctx.baseVariants;

  const coreCount = sampleVariants.length;
  const geoNodeCount = ctx.geoNodes.length;
  const perProduct = coreCount + geoNodeCount;
  const byPageType: Record<string, number> = {};
  for (const v of sampleVariants) {
    byPageType[v.pageType] = (byPageType[v.pageType] || 0) + 1;
  }
  if (geoNodeCount) byPageType.product_geo = geoNodeCount;

  const warnings: string[] = [];
  if (includeGeo && geoNodeCount === 0) {
    warnings.push("GEO katmanı seçildi ancak veritabanında aktif kayıt bulunamadı — mahalle/köy/cadde için Data Universe import gerekebilir.");
  }

  return {
    totalProducts: productCount,
    estimatedBlueprints: productCount * perProduct,
    perProductMin: perProduct,
    geoCount: productCount * (byPageType.product_geo || 0),
    intentCount: productCount * (byPageType.product_intent || 0),
    faqCount: productCount * (byPageType.product_faq || 0),
    categoryCount: productCount * (byPageType.product_category || 0),
    variantsPerProduct: coreCount,
    geoNodesPerProduct: geoNodeCount,
    geoCatalog: ctx.geoCatalog,
    byPageType,
    warnings,
  };
}

export async function previewUniverseGeneration(
  filters: UniverseGeneratorFilters,
  opts: { dealerId?: string | null; isAdmin?: boolean }
): Promise<UniversePreviewResult> {
  const mode = filters.mode || "full";
  const includeGeo =
    mode === "geo_only" ? true : filters.includeGeo !== false && mode !== "faq_only";
  const { products, totalProducts } = await resolveUniverseProducts(filters, opts);
  const projectId = filters.projectId;
  const existingMap = projectId ? await loadExistingBlueprintMap(projectId) : new Map<string, string>();
  const slugSet = projectId ? await loadExistingSlugs(projectId) : new Set<string>();
  const ctx = await loadUniverseContext(filters, mode, includeGeo);

  const allDrafts: UniverseBlueprintDraft[] = [];
  let duplicateCount = 0;
  const warnings: string[] = [];

  if (totalProducts === 0) {
    warnings.push("Product Universe'de seçilen filtrelere uyan ürün bulunamadı.");
  }
  if (includeGeo && ctx.geoNodes.length === 0) {
    warnings.push("GEO katmanı seçildi ancak veritabanında aktif kayıt bulunamadı — mahalle/köy/cadde için Data Universe import gerekebilir.");
  }

  for (const product of products) {
    const variants = resolveVariantsForProduct(ctx.baseVariants, product, ctx.categoryCatalog);
    const drafts = buildDraftsForProduct(product, mode, includeGeo, slugSet, variants, ctx.geoNodes);
    for (const d of drafts) {
      const dupKey = buildDupKey(product.id, d.pageType, d.variantKey);
      if (existingMap.has(dupKey)) duplicateCount += 1;
      allDrafts.push(d);
    }
  }

  const estimate = await estimateUniverseSize(products.length || totalProducts, {
    mode,
    includeGeo,
    geoLevel: filters.geoLevel,
    geoLimit: filters.geoLimit,
    provinceIds: filters.provinceIds,
    districtIds: filters.districtIds,
    neighborhoodIds: filters.neighborhoodIds,
    villageIds: filters.villageIds,
    sampleCategoryPath: products[0]?.categoryPath,
  });
  estimate.warnings = [...estimate.warnings, ...warnings];
  estimate.totalProducts = totalProducts;

  return {
    ...estimate,
    estimatedBlueprints: allDrafts.length,
    sampleBlueprints: allDrafts.slice(0, 10),
    sampleProducts: products.slice(0, 10).map(toProductSample),
    duplicateCount,
    warnings,
  };
}

async function upsertBlueprint(
  projectId: string,
  product: UniverseProductBundle,
  draft: UniverseBlueprintDraft,
  existingMap: Map<string, string>,
  jobId: string,
  sourceTypeFilter?: UniverseSourceType
): Promise<"created" | "updated" | "skipped"> {
  const dupKey = buildDupKey(product.id, draft.pageType, draft.variantKey);
  const slugDupKey = `${product.id}:${draft.pageType}:${draft.slug}`;
  const existingId = existingMap.get(dupKey) || existingMap.get(slugDupKey);

  const metadata = buildMetadata(product, draft, jobId, sourceTypeFilter);
  const data = {
    title: draft.title,
    pageType: draft.pageType,
    hierarchyLevel: HIERARCHY[draft.pageType] ?? 2,
    clusterPath: String(metadata.clusterPath || "Product"),
    metadataJson: JSON.stringify(metadata),
  };

  if (existingId && existingId !== "new") {
    await prisma.pageFactoryBlueprint.update({ where: { id: existingId }, data });
    return "updated";
  }

  const created = await prisma.pageFactoryBlueprint.create({
    data: { projectId, ...data },
  });
  existingMap.set(dupKey, created.id);
  existingMap.set(slugDupKey, created.id);
  return "created";
}

export async function generateUniverseForProduct(
  productId: string,
  filters: UniverseGeneratorFilters,
  opts: { dealerId?: string | null; isAdmin?: boolean }
): Promise<UniverseGenerateResult> {
  return generateUniverseFromProducts(
    { ...filters, productIds: [productId] },
    opts
  );
}

export async function generateUniverseFromProducts(
  filters: UniverseGeneratorFilters,
  opts: { dealerId?: string | null; isAdmin?: boolean }
): Promise<UniverseGenerateResult> {
  const projectId = filters.projectId;
  if (!projectId) {
    throw new Error("projectId gerekli — Page Factory projesi seçin");
  }

  if (!filters.dryRun) {
    const project = await prisma.pageFactoryProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Proje bulunamadı");
    if (!opts.isAdmin && opts.dealerId && project.dealerId && project.dealerId !== opts.dealerId) {
      throw new Error("Bu projeye erişim yetkiniz yok");
    }
  }

  const mode = filters.mode || "full";
  const includeGeo =
    mode === "geo_only" ? true : filters.includeGeo !== false && mode !== "faq_only";
  const preview = await previewUniverseGeneration(filters, opts);
  const { products } = await resolveUniverseProducts(filters, opts);

  if (!filters.dryRun && products.length === 0) {
    throw new Error("Üretilecek ürün bulunamadı — Product Universe filtresini kontrol edin");
  }

  let jobId = "dry-run";
  if (!filters.dryRun) {
    const job = await prisma.pageFactoryUniverseJob.create({
      data: {
        dealerId: opts.dealerId || null,
        projectId: projectId || null,
        sourceType: filters.sourceType || "ALL",
        status: "RUNNING",
        totalProducts: products.length,
        totalBlueprints: preview.estimatedBlueprints,
        startedAt: new Date(),
        metadataJson: JSON.stringify({ filters, mode, includeGeo }),
      },
    });
    jobId = job.id;
  }

  const existingMap = projectId ? await loadExistingBlueprintMap(projectId) : new Map<string, string>();
  const slugSet = projectId ? await loadExistingSlugs(projectId) : new Set<string>();
  const ctx = await loadUniverseContext(filters, mode, includeGeo);

  let generatedBlueprints = 0;
  let updatedBlueprints = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const errors: Array<{ productId: string; message: string }> = [];
  const warnings = [...preview.warnings];
  let geoCount = 0;
  let intentCount = 0;
  let faqCount = 0;

  for (let i = 0; i < products.length; i += UNIVERSE_LIMITS.chunkSize) {
    const chunk = products.slice(i, i + UNIVERSE_LIMITS.chunkSize);
    for (const product of chunk) {
      try {
        const variants = resolveVariantsForProduct(ctx.baseVariants, product, ctx.categoryCatalog);
        const drafts = buildDraftsForProduct(product, mode, includeGeo, slugSet, variants, ctx.geoNodes);
        for (const draft of drafts) {
          if (draft.pageType === "product_geo") geoCount += 1;
          if (draft.pageType === "product_intent") intentCount += 1;
          if (draft.pageType === "product_faq") faqCount += 1;

          if (filters.dryRun) {
            generatedBlueprints += 1;
            continue;
          }

          const result = await upsertBlueprint(
            projectId!,
            product,
            draft,
            existingMap,
            jobId,
            filters.sourceType
          );
          if (result === "created") generatedBlueprints += 1;
          else if (result === "updated") {
            updatedBlueprints += 1;
            duplicateCount += 1;
          } else skippedCount += 1;
        }
      } catch (e) {
        errorCount += 1;
        errors.push({
          productId: product.id,
          message: e instanceof Error ? e.message : "Universe üretim hatası",
        });
      }
    }
  }

  const totalGenerated = generatedBlueprints + updatedBlueprints;

  let pipelineJobId: string | undefined;
  let pipelineResult: UniverseGenerateResult["pipelineResult"];

  if (!filters.dryRun && jobId !== "dry-run" && filters.autoRunPipeline && totalGenerated > 0) {
    try {
      const pipe = await runPipelineForUniverseJob(
        jobId,
        {
          autoRunPipeline: true,
          autoPublishInternal: filters.autoPublishInternal === true,
          pipelineLimit: filters.pipelineLimit ?? 100,
          minPublishScore: filters.minPublishScore ?? 70,
          blueprintTypes: filters.blueprintTypes,
          stopOnError: filters.stopOnError ?? false,
        },
        opts
      );
      pipelineJobId = pipe.jobId;
      pipelineResult = {
        triggeredByUniverseJobId: jobId,
        processedBlueprints: pipe.processedBlueprints,
        aeoGenerated: pipe.aeoGenerated,
        draftsGenerated: pipe.draftsGenerated,
        gatesGenerated: pipe.gatesGenerated,
        pagesPublished: pipe.pagesPublished,
        pagesUpdated: pipe.pagesUpdated,
        errorCount: pipe.errorCount,
      };
      if (pipe.warnings.length) warnings.push(...pipe.warnings);
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : "Otomatik pipeline başarısız");
    }
  }

  if (!filters.dryRun && jobId !== "dry-run") {
    await prisma.pageFactoryUniverseJob.update({
      where: { id: jobId },
      data: {
        status: errorCount > 0 && totalGenerated === 0 ? "FAILED" : "COMPLETED",
        generatedBlueprints: totalGenerated,
        completedAt: new Date(),
        metadataJson: JSON.stringify({
          filters,
          mode,
          includeGeo,
          generatedBlueprints,
          updatedBlueprints,
          skippedCount,
          duplicateCount,
          errorCount,
          geoCount,
          intentCount,
          faqCount,
          errors,
          pipelineJobId,
          pipelineResult,
          autoRunPipeline: filters.autoRunPipeline === true,
          autoPublishInternal: filters.autoPublishInternal === true,
        }),
      },
    });
  }

  return {
    jobId,
    totalProducts: products.length,
    totalBlueprints: preview.estimatedBlueprints,
    generatedBlueprints: totalGenerated,
    updatedBlueprints,
    skippedCount,
    duplicateCount,
    errorCount,
    geoCount,
    intentCount,
    faqCount,
    warnings,
    errors,
    dryRun: !!filters.dryRun,
    pipelineJobId,
    pipelineResult,
  };
}

export async function getUniverseJobs(opts: {
  dealerId?: string | null;
  projectId?: string;
  page?: number;
  limit?: number;
}) {
  const page = opts.page || 1;
  const limit = Math.min(50, opts.limit || 20);
  const where: { dealerId?: string; projectId?: string } = {};
  if (opts.dealerId) where.dealerId = opts.dealerId;
  if (opts.projectId) where.projectId = opts.projectId;

  const [items, total] = await Promise.all([
    prisma.pageFactoryUniverseJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pageFactoryUniverseJob.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getUniverseJob(id: string, dealerId?: string | null) {
  const job = await prisma.pageFactoryUniverseJob.findUnique({ where: { id } });
  if (!job) return null;
  if (dealerId && job.dealerId && job.dealerId !== dealerId) return null;
  return job;
}

export async function getUniverseDashboardStats(
  filters: UniverseProductSourceFilters & Pick<UniverseGeneratorFilters, "geoLevel" | "geoLimit" | "provinceIds" | "districtIds" | "neighborhoodIds" | "villageIds" | "includeGeo">,
  opts: { dealerId?: string | null; isAdmin?: boolean }
) {
  const projectId = filters.projectId;
  const productCount = await countUniverseProducts(filters, opts);

  const jobWhere = projectId ? { projectId } : {};
  const [lastJob, blueprintCount] = await Promise.all([
    prisma.pageFactoryUniverseJob.findFirst({
      where: jobWhere,
      orderBy: { createdAt: "desc" },
    }),
    projectId
      ? prisma.pageFactoryBlueprint.count({
          where: {
            projectId,
            OR: [
              { metadataJson: { contains: UNIVERSE_BRIDGE_GENERATION_SOURCE } },
              { metadataJson: { contains: UNIVERSE_PRE_BRIDGE_SOURCE } },
              { metadataJson: { contains: "PRODUCT_UNIVERSE_V2" } },
            ],
          },
        })
      : prisma.pageFactoryBlueprint.count({
          where: {
            OR: [
              { metadataJson: { contains: UNIVERSE_BRIDGE_GENERATION_SOURCE } },
              { metadataJson: { contains: UNIVERSE_PRE_BRIDGE_SOURCE } },
            ],
          },
        }),
  ]);

  const estimate = await estimateUniverseSize(productCount, {
    mode: "full",
    includeGeo: true,
    geoLevel: filters.geoLevel || "province",
    geoLimit: filters.geoLimit,
    provinceIds: filters.provinceIds,
    districtIds: filters.districtIds,
    neighborhoodIds: filters.neighborhoodIds,
    villageIds: filters.villageIds,
  });

  return {
    totalProducts: productCount,
    estimatedBlueprints: estimate.estimatedBlueprints,
    generatedBlueprints: blueprintCount,
    lastJob: lastJob
      ? {
          id: lastJob.id,
          status: lastJob.status,
          totalProducts: lastJob.totalProducts,
          generatedBlueprints: lastJob.generatedBlueprints,
          createdAt: lastJob.createdAt.toISOString(),
        }
      : null,
    geoCount: estimate.geoCount,
    intentCount: estimate.intentCount,
    faqCount: estimate.faqCount,
    categoryCount: estimate.categoryCount,
    variantsPerProduct: estimate.variantsPerProduct,
    geoNodesPerProduct: estimate.geoNodesPerProduct,
    geoCatalog: estimate.geoCatalog,
  };
}
