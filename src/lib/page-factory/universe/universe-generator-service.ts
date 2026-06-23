import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type {
  ProductAttribute,
  ProductContentDNA,
  ProductEntity,
  ProductImage,
  ProductUniverse,
  ProductUniverseSourceType,
} from "@prisma/client";
import {
  TOP_20_CITIES,
  UNIVERSE_GENERATION_SOURCE,
  UNIVERSE_LIMITS,
  type UniverseBlueprintDraft,
  type UniverseBlueprintKind,
  type UniverseEstimateResult,
  type UniverseGenerateResult,
  type UniverseGeneratorFilters,
  type UniverseGenerationMode,
  type UniversePageType,
  type UniversePreviewResult,
  type UniverseSourceType,
  resolveUniverseLimit,
} from "./universe-types";

type ProductBundle = ProductUniverse & {
  entities: ProductEntity[];
  attributes: ProductAttribute[];
  images: ProductImage[];
  contentDNA: ProductContentDNA | null;
};

const HIERARCHY: Record<UniversePageType, number> = {
  product_geo: 1,
  product_intent: 2,
  product_faq: 2,
  product_guide: 2,
  product_benefit: 2,
  product_problem: 2,
  product_comparison: 2,
  product_alternative: 2,
  product_detail: 4,
};

type VariantSpec = {
  pageType: UniversePageType;
  blueprintKind: UniverseBlueprintKind;
  variantKey: string;
  titleSuffix: string;
  slugSuffix: string;
  intent: string;
  targetQueryTemplate: (name: string) => string;
};

const CORE_VARIANTS: VariantSpec[] = [
  { pageType: "product_detail", blueprintKind: "PRODUCT_DETAIL", variantKey: "default", titleSuffix: "", slugSuffix: "", intent: "commercial", targetQueryTemplate: (n) => n.toLowerCase() },
  { pageType: "product_faq", blueprintKind: "PRODUCT_FAQ", variantKey: "default", titleSuffix: " — SSS", slugSuffix: "", intent: "informational", targetQueryTemplate: (n) => `${n.toLowerCase()} sık sorulan sorular` },
  { pageType: "product_intent", blueprintKind: "PRODUCT_INTENT", variantKey: "nasil-secilir", titleSuffix: " Nasıl Seçilir?", slugSuffix: "nasil-secilir", intent: "commercial", targetQueryTemplate: (n) => `${n.toLowerCase()} nasıl seçilir` },
  { pageType: "product_intent", blueprintKind: "PRODUCT_INTENT", variantKey: "en-iyi-mi", titleSuffix: " En İyi Mi?", slugSuffix: "en-iyi-mi", intent: "comparison", targetQueryTemplate: (n) => `${n.toLowerCase()} en iyi mi` },
  { pageType: "product_intent", blueprintKind: "PRODUCT_INTENT", variantKey: "kime-uygun", titleSuffix: " Kime Uygun?", slugSuffix: "kime-uygun", intent: "informational", targetQueryTemplate: (n) => `${n.toLowerCase()} kime uygun` },
  { pageType: "product_guide", blueprintKind: "PRODUCT_GUIDE", variantKey: "nasil-kullanilir", titleSuffix: " Nasıl Kullanılır?", slugSuffix: "nasil-kullanilir", intent: "howto", targetQueryTemplate: (n) => `${n.toLowerCase()} nasıl kullanılır` },
  { pageType: "product_guide", blueprintKind: "PRODUCT_GUIDE", variantKey: "bakim-ipuclari", titleSuffix: " Bakım İpuçları", slugSuffix: "bakim-ipuclari", intent: "howto", targetQueryTemplate: (n) => `${n.toLowerCase()} bakım ipuçları` },
  { pageType: "product_benefit", blueprintKind: "PRODUCT_BENEFIT", variantKey: "avantajlari", titleSuffix: " Avantajları", slugSuffix: "avantajlari", intent: "informational", targetQueryTemplate: (n) => `${n.toLowerCase()} avantajları` },
  { pageType: "product_benefit", blueprintKind: "PRODUCT_BENEFIT", variantKey: "neden-tercih", titleSuffix: " Neden Tercih Edilmeli?", slugSuffix: "neden-tercih", intent: "commercial", targetQueryTemplate: (n) => `${n.toLowerCase()} neden tercih edilmeli` },
  { pageType: "product_problem", blueprintKind: "PRODUCT_PROBLEM", variantKey: "sorun-cozumu", titleSuffix: " Sorun Çözümü", slugSuffix: "sorun-cozumu", intent: "problem", targetQueryTemplate: (n) => `${n.toLowerCase()} sorun çözümü` },
  { pageType: "product_problem", blueprintKind: "PRODUCT_PROBLEM", variantKey: "dikkat-edilecekler", titleSuffix: " Dikkat Edilecekler", slugSuffix: "dikkat-edilecekler", intent: "informational", targetQueryTemplate: (n) => `${n.toLowerCase()} dikkat edilecekler` },
];

function parseJsonArray(json: string): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function getProductStock(product: ProductBundle): number | null {
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

function shouldNoindex(product: ProductBundle): boolean {
  if (product.qualityScore < 70) return true;
  if (product.duplicateGroupId) return true;
  if (!product.descriptionClean?.trim()) return true;
  if (!product.images.length) return true;
  if (!product.entities.length) return true;
  return false;
}

function computePriorityScore(product: ProductBundle): number {
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
  product: ProductBundle,
  draft: UniverseBlueprintDraft,
  jobId?: string
): Record<string, unknown> {
  const dna = product.contentDNA;
  const stock = getProductStock(product);
  const imageUrls = product.images.map((i) => i.publicUrl || i.sourceUrl).filter(Boolean);
  const categoryLabel = product.categoryPath.split(/[>/|]/).pop()?.trim() || product.categoryPath;

  return {
    generationSource: UNIVERSE_GENERATION_SOURCE,
    universeVersion: "PAGE_FACTORY_UNIVERSE_GENERATOR_V1",
    productUniverseId: product.id,
    productId: product.id,
    sourceType: product.sourceType,
    productName: product.normalizedName,
    brand: product.brand,
    category: product.categoryPath,
    categoryPath: product.categoryPath,
    sku: product.stockCode,
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
    createdByUniverseJobId: jobId || null,
    blueprintKind: draft.blueprintKind,
    universeVariantKey: draft.variantKey,
    contentStatus: "NOT_GENERATED",
    status: "DRAFT",
    slug: draft.slug,
    targetQuery: draft.targetQuery,
    intent: draft.intent,
    geoTarget: draft.geoTarget,
    priorityScore: draft.priorityScore,
    province: draft.metadata?.province || null,
    region: draft.metadata?.region || null,
    geoPath: draft.metadata?.geoPath || null,
    clusterPath: draft.metadata?.clusterPath || `Product > ${categoryLabel}`,
  };
}

function resolveVariants(mode: UniverseGenerationMode, includeGeo: boolean): VariantSpec[] {
  if (mode === "faq_only") {
    return CORE_VARIANTS.filter((v) => v.pageType === "product_faq");
  }
  if (mode === "geo_only") {
    return [];
  }
  return CORE_VARIANTS;
}

function buildDraftsForProduct(
  product: ProductBundle,
  mode: UniverseGenerationMode,
  includeGeo: boolean,
  slugSet: Set<string>
): UniverseBlueprintDraft[] {
  const drafts: UniverseBlueprintDraft[] = [];
  const name = product.normalizedName;
  const priorityScore = computePriorityScore(product);
  const categoryLabel = product.categoryPath.split(/[>/|]/).pop()?.trim() || product.categoryPath;
  const variants = resolveVariants(mode, includeGeo);

  for (const spec of variants) {
    const slugBase = spec.slugSuffix ? `${product.slug}-${spec.slugSuffix}` : product.slug;
    const slug = uniqueSlug(slugBase, slugSet);
    const title = `${name}${spec.titleSuffix}`;

    drafts.push({
      productId: product.id,
      productName: name,
      pageType: spec.pageType,
      blueprintKind: spec.blueprintKind,
      variantKey: spec.variantKey,
      title,
      slug,
      targetQuery: spec.targetQueryTemplate(name),
      intent: spec.intent,
      geoTarget: null,
      priorityScore,
      qualityScore: product.qualityScore,
      metadata: {
        province: null,
        region: null,
        geoPath: null,
        clusterPath: `Product > ${categoryLabel}`,
      },
    });
  }

  if ((mode === "full" || mode === "geo_only" || mode === "selected") && includeGeo) {
    for (const city of TOP_20_CITIES) {
      const slug = uniqueSlug(product.slug, slugSet);
      drafts.push({
        productId: product.id,
        productName: name,
        pageType: "product_geo",
        blueprintKind: "PRODUCT_GEO",
        variantKey: city.slug,
        title: `${city.name} ${name}`,
        slug,
        targetQuery: `${city.name.toLowerCase()} ${name.toLowerCase()}`,
        intent: "local",
        geoTarget: city.name,
        priorityScore,
        qualityScore: product.qualityScore,
        metadata: {
          province: city.name,
          region: city.region,
          geoPath: city.name,
          clusterPath: `Product > ${categoryLabel} > GEO > ${city.name}`,
        },
      });
    }
  }

  return drafts;
}

function matchesSourceType(product: ProductBundle, sourceType: UniverseSourceType): boolean {
  if (sourceType === "ALL" || sourceType === "PRODUCT_UNIVERSE") return true;

  if (sourceType === "XLSX") return product.sourceType === "XLSX";
  if (sourceType === "XML") return product.sourceType === "XML";
  if (sourceType === "CSV") return product.sourceType === "CSV";

  if (sourceType === "THYRONIX") {
    try {
      const meta = JSON.parse(product.metadataJson || "{}") as { importSource?: string; bridgeType?: string };
      return (
        meta.importSource?.includes("THYRONIX") === true ||
        meta.bridgeType === "THYRONIX_BRIDGE_V1" ||
        product.sourceFileName.includes("THYRONIX")
      );
    } catch {
      return product.sourceFileName.includes("THYRONIX");
    }
  }

  if (sourceType === "PRODUCT_LIBRARY") {
    try {
      const meta = JSON.parse(product.metadataJson || "{}") as { importSource?: string; catalogId?: string };
      return meta.importSource === "PRODUCT_LIBRARY" || !!meta.catalogId;
    } catch {
      return false;
    }
  }

  return true;
}

async function loadProducts(
  filters: UniverseGeneratorFilters,
  opts: { dealerId?: string | null; isAdmin?: boolean }
): Promise<{ products: ProductBundle[]; totalProducts: number }> {
  const minQuality = filters.minQualityScore ?? 0;
  const limit = resolveUniverseLimit(filters.limit, opts.isAdmin);
  const sourceType = filters.sourceType || "ALL";

  if (filters.productIds?.length) {
    const products = await prisma.productUniverse.findMany({
      where: {
        id: { in: filters.productIds },
        ...(opts.dealerId && !opts.isAdmin ? { dealerId: opts.dealerId } : {}),
      },
      include: { entities: true, attributes: true, images: true, contentDNA: true },
    });
    return { products: products as ProductBundle[], totalProducts: products.length };
  }

  const where: {
    status: "BLUEPRINT_READY";
    qualityScore: { gte: number };
    dealerId?: string;
    sourceType?: ProductUniverseSourceType;
    projectId?: string;
  } = {
    status: "BLUEPRINT_READY",
    qualityScore: { gte: minQuality },
  };

  if (!opts.isAdmin && opts.dealerId) where.dealerId = opts.dealerId;
  if (filters.projectId) where.projectId = filters.projectId;

  if (sourceType === "XLSX") where.sourceType = "XLSX";
  else if (sourceType === "XML") where.sourceType = "XML";
  else if (sourceType === "CSV") where.sourceType = "CSV";

  const totalProducts = await prisma.productUniverse.count({ where });

  let products = await prisma.productUniverse.findMany({
    where,
    include: { entities: true, attributes: true, images: true, contentDNA: true },
    orderBy: [{ qualityScore: "desc" }, { updatedAt: "desc" }],
    take: Math.min(limit, totalProducts),
  });

  if (["THYRONIX", "PRODUCT_LIBRARY", "ALL"].includes(sourceType)) {
    products = products.filter((p) => matchesSourceType(p as ProductBundle, sourceType));
  }

  return { products: products as ProductBundle[], totalProducts };
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
        generationSource?: string;
        universeVariantKey?: string;
        slug?: string;
      };
      const pid = m.productUniverseId || m.productId;
      if (!pid) continue;
      if (
        m.generationSource !== UNIVERSE_GENERATION_SOURCE &&
        m.generationSource !== "PRODUCT_UNIVERSE_BATCH_V1" &&
        m.generationSource !== "PRODUCT_UNIVERSE_V2"
      ) {
        continue;
      }
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
  for (const d of drafts) {
    byPageType[d.pageType] = (byPageType[d.pageType] || 0) + 1;
    if (d.pageType === "product_geo") geoCount += 1;
    if (d.pageType === "product_intent") intentCount += 1;
    if (d.pageType === "product_faq") faqCount += 1;
  }
  return { byPageType, geoCount, intentCount, faqCount };
}

export function estimateUniverseSize(
  productCount: number,
  mode: UniverseGenerationMode = "full",
  includeGeo = true
): UniverseEstimateResult {
  const coreCount = resolveVariants(mode, includeGeo).length;
  const geoCount = (mode === "full" || mode === "geo_only" || mode === "selected") && includeGeo ? TOP_20_CITIES.length : 0;
  const perProduct = coreCount + geoCount;
  const byPageType: Record<string, number> = {};
  for (const v of resolveVariants(mode, includeGeo)) {
    byPageType[v.pageType] = (byPageType[v.pageType] || 0) + 1;
  }
  if (geoCount) byPageType.product_geo = geoCount;

  return {
    totalProducts: productCount,
    estimatedBlueprints: productCount * perProduct,
    perProductMin: mode === "full" ? UNIVERSE_LIMITS.minBlueprintsPerProduct : perProduct,
    geoCount: productCount * (byPageType.product_geo || 0),
    intentCount: productCount * (byPageType.product_intent || 0),
    faqCount: productCount * (byPageType.product_faq || 0),
    byPageType,
    warnings: [],
  };
}

export async function previewUniverseGeneration(
  filters: UniverseGeneratorFilters,
  opts: { dealerId?: string | null; isAdmin?: boolean }
): Promise<UniversePreviewResult> {
  const mode = filters.mode || "full";
  const includeGeo =
    mode === "geo_only" ? true : filters.includeGeo !== false && mode !== "faq_only";
  const { products, totalProducts } = await loadProducts(filters, opts);
  const existingMap = await loadExistingBlueprintMap(filters.projectId);
  const slugSet = await loadExistingSlugs(filters.projectId);

  const allDrafts: UniverseBlueprintDraft[] = [];
  let duplicateCount = 0;
  const warnings: string[] = [];

  for (const product of products) {
    const drafts = buildDraftsForProduct(product, mode, includeGeo, slugSet);
    for (const d of drafts) {
      const dupKey = buildDupKey(product.id, d.pageType, d.variantKey);
      if (existingMap.has(dupKey)) duplicateCount += 1;
      allDrafts.push(d);
    }
  }

  const counts = countByType(allDrafts);
  const estimate = estimateUniverseSize(products.length, mode, includeGeo);
  estimate.warnings = warnings;
  estimate.totalProducts = totalProducts;

  return {
    ...estimate,
    estimatedBlueprints: allDrafts.length,
    sampleBlueprints: allDrafts.slice(0, UNIVERSE_LIMITS.previewSampleSize),
    duplicateCount,
    warnings,
  };
}

async function upsertBlueprint(
  projectId: string,
  product: ProductBundle,
  draft: UniverseBlueprintDraft,
  existingMap: Map<string, string>,
  jobId: string
): Promise<"created" | "updated" | "skipped"> {
  const dupKey = buildDupKey(product.id, draft.pageType, draft.variantKey);
  const slugDupKey = `${product.id}:${draft.pageType}:${draft.slug}`;
  const existingId = existingMap.get(dupKey) || existingMap.get(slugDupKey);

  const metadata = buildMetadata(product, draft, jobId);
  const data = {
    title: draft.title,
    pageType: draft.pageType,
    hierarchyLevel: HIERARCHY[draft.pageType],
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
  if (!projectId && !filters.dryRun) {
    throw new Error("projectId gerekli");
  }

  if (projectId) {
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
  const { products } = await loadProducts(filters, opts);

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
        const drafts = buildDraftsForProduct(product, mode, includeGeo, slugSet);
        for (const draft of drafts) {
          if (draft.pageType === "product_geo") geoCount += 1;
          if (draft.pageType === "product_intent") intentCount += 1;
          if (draft.pageType === "product_faq") faqCount += 1;

          if (filters.dryRun) {
            generatedBlueprints += 1;
            continue;
          }

          const result = await upsertBlueprint(projectId!, product, draft, existingMap, jobId);
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

export async function getUniverseDashboardStats(projectId?: string) {
  const where = projectId ? { projectId } : {};
  const [productCount, lastJob, blueprintCount] = await Promise.all([
    prisma.productUniverse.count({ where: { status: "BLUEPRINT_READY", ...(projectId ? { projectId } : {}) } }),
    prisma.pageFactoryUniverseJob.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    }),
    projectId
      ? prisma.pageFactoryBlueprint.count({
          where: {
            projectId,
            metadataJson: { contains: UNIVERSE_GENERATION_SOURCE },
          },
        })
      : prisma.pageFactoryBlueprint.count({
          where: { metadataJson: { contains: UNIVERSE_GENERATION_SOURCE } },
        }),
  ]);

  const estimate = estimateUniverseSize(productCount, "full", true);

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
  };
}
