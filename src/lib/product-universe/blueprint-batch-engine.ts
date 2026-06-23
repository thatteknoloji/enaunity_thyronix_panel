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
  BATCH_GENERATION_SOURCE,
  BATCH_LIMITS,
  type BlueprintBatchFilters,
  type BlueprintBatchGenerateResult,
  type BlueprintBatchPreviewResult,
  type BlueprintTypeSlug,
  type DuplicateMode,
  type SampleBlueprint,
  defaultBlueprintTypes,
  resolveBatchLimit,
} from "./blueprint-batch-types";

type ProductBundle = ProductUniverse & {
  entities: ProductEntity[];
  attributes: ProductAttribute[];
  images: ProductImage[];
  contentDNA: ProductContentDNA | null;
};

const PAGE_TYPE_MAP: Record<BlueprintTypeSlug, string> = {
  product_detail: "product_detail",
  product_category: "product_category",
  product_intent: "product_intent",
  product_geo: "product_geo",
  product_faq: "product_faq",
};

const HIERARCHY: Record<BlueprintTypeSlug, number> = {
  product_geo: 1,
  product_intent: 2,
  product_faq: 2,
  product_category: 3,
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
  if (slug.length <= BATCH_LIMITS.maxSlugLength) return slug;
  return slug.slice(0, BATCH_LIMITS.maxSlugLength).replace(/-+$/, "");
}

async function uniqueSlug(base: string, existing: Set<string>): Promise<string> {
  let slug = truncateSlug(slugify(base) || "blueprint");
  let n = 0;
  while (existing.has(slug)) {
    n += 1;
    slug = truncateSlug(`${slugify(base)}-${n}`);
  }
  existing.add(slug);
  return slug;
}

function buildBatchMetadata(
  product: ProductBundle,
  blueprintType: BlueprintTypeSlug,
  extras: Record<string, unknown>,
  jobId?: string
): Record<string, unknown> {
  const dna = product.contentDNA;
  const stock = getProductStock(product);
  const imageUrls = product.images.map((i) => i.publicUrl || i.sourceUrl).filter(Boolean);
  const primaryEntity = product.entities.find((e) => e.type === "CATEGORY" || e.type === "BRAND");

  return {
    generationSource: BATCH_GENERATION_SOURCE,
    productUniverseId: product.id,
    productId: product.id,
    productEntityId: primaryEntity?.id || null,
    sourceType: product.sourceType,
    sourceId: product.projectId || product.sourceFileName || null,
    productName: product.normalizedName,
    brand: product.brand,
    category: product.categoryPath,
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
    extractedEntities: product.entities.map((e) => ({
      id: e.id,
      type: e.type,
      value: e.value,
      confidence: e.confidence,
    })),
    qualityScore: product.qualityScore,
    suggestedKeywords: [dna?.targetKeyword, product.normalizedName, product.brand].filter(Boolean),
    faqSeeds: parseJsonArray(dna?.faqSeedsJson || "[]"),
    internalLinkHints: parseJsonArray(dna?.internalLinkHintsJson || "[]"),
    aeoHints: parseJsonArray(dna?.schemaHintsJson || "[]"),
    noindexRecommended: shouldNoindex(product),
    createdByBatchJobId: jobId || null,
    blueprintKind: blueprintType.toUpperCase(),
    contentStatus: "NOT_GENERATED",
    status: "DRAFT",
    ...extras,
  };
}

async function buildDraftsForProduct(
  product: ProductBundle,
  types: BlueprintTypeSlug[],
  slugSet: Set<string>,
  includeGeo: boolean
): Promise<SampleBlueprint[]> {
  const drafts: SampleBlueprint[] = [];
  const dna = product.contentDNA;
  const categoryLabel = product.categoryPath.split(/[>/|]/).pop()?.trim() || product.categoryPath;
  const priorityScore = computePriorityScore(product);
  const baseIntent = dna?.intent || "commercial";
  const targetQuery = dna?.targetKeyword || product.normalizedName.toLowerCase();

  for (const bpType of types) {
    if (bpType === "product_category" && !product.categoryPath) continue;
    if (bpType === "product_intent" && !dna?.intent) continue;
    if (bpType === "product_faq" && !parseJsonArray(dna?.faqSeedsJson || "[]").length) continue;

    let title = product.normalizedName;
    let slugBase = `urun-${product.slug}`;
    let geoTarget: string | null = null;
    let clusterPath = ["Product", categoryLabel].filter(Boolean).join(" > ");
    const extras: Record<string, unknown> = {
      slug: "",
      targetQuery,
      intent: baseIntent,
      geoTarget: null,
      priorityScore,
    };

    switch (bpType) {
      case "product_detail":
        title = product.normalizedName;
        slugBase = `urun-${product.slug}`;
        break;
      case "product_category":
        title = categoryLabel;
        slugBase = `kategori-${slugify(categoryLabel)}`;
        extras.targetQuery = categoryLabel.toLowerCase();
        break;
      case "product_intent":
        title = `${dna!.primaryEntity} — ${dna!.intent}`;
        slugBase = `intent-${slugify(dna!.primaryEntity)}-${dna!.intent}`;
        extras.intent = dna!.intent;
        break;
      case "product_faq":
        title = `${product.normalizedName} — SSS`;
        slugBase = `faq-${product.slug}`;
        break;
      case "product_geo":
        if (!includeGeo) continue;
        geoTarget = "Türkiye";
        title = `Türkiye ${dna?.primaryEntity || product.normalizedName}`;
        slugBase = `geo-tr-${product.slug}`;
        extras.geoTarget = geoTarget;
        extras.targetQuery = `türkiye ${targetQuery}`;
        clusterPath = ["Product", categoryLabel, "GEO"].filter(Boolean).join(" > ");
        break;
    }

    const slug = await uniqueSlug(`${slugBase}-${bpType.replace("_", "-")}`, slugSet);
    extras.slug = slug;

    drafts.push({
      productId: product.id,
      productName: product.normalizedName,
      blueprintType: bpType,
      title,
      slug,
      targetQuery: String(extras.targetQuery || targetQuery),
      intent: String(extras.intent || baseIntent),
      geoTarget,
      priorityScore,
      qualityScore: product.qualityScore,
      metadata: buildBatchMetadata(product, bpType, extras),
    });
  }

  return drafts;
}

async function loadCandidates(
  filters: BlueprintBatchFilters,
  opts: { dealerId?: string | null; isAdmin?: boolean }
): Promise<{ products: ProductBundle[]; totalCandidates: number; warnings: string[] }> {
  const warnings: string[] = [];
  const minQuality = filters.minQualityScore ?? 70;
  const limit = resolveBatchLimit(filters.limit, opts.isAdmin);

  const where: {
    status: "BLUEPRINT_READY";
    qualityScore: { gte: number };
    dealerId?: string;
    sourceType?: ProductUniverseSourceType;
    categoryPath?: { contains: string };
    brand?: string;
    images?: { some: Record<string, never> };
  } = {
    status: "BLUEPRINT_READY",
    qualityScore: { gte: minQuality },
  };

  if (!opts.isAdmin && opts.dealerId) where.dealerId = opts.dealerId;
  if (filters.sourceType) where.sourceType = filters.sourceType as ProductUniverseSourceType;
  if (filters.category) where.categoryPath = { contains: filters.category };
  if (filters.brand) where.brand = filters.brand;
  if (filters.onlyWithImages) where.images = { some: {} };

  const totalCandidates = await prisma.productUniverse.count({ where });

  if (totalCandidates > BATCH_LIMITS.planOnlyThreshold) {
    warnings.push(`${totalCandidates.toLocaleString("tr-TR")}+ aday — plan-only uyarısı`);
  }

  let products = await prisma.productUniverse.findMany({
    where,
    include: { entities: true, attributes: true, images: true, contentDNA: true },
    orderBy: [{ qualityScore: "desc" }, { updatedAt: "desc" }],
    take: Math.min(limit, totalCandidates),
  });

  if (filters.onlyInStock) {
    products = products.filter((p) => {
      const stock = getProductStock(p as ProductBundle);
      return stock != null && stock > 0;
    });
  }

  if (filters.sourceId) {
    products = products.filter((p) => {
      try {
        const meta = JSON.parse(p.metadataJson || "{}") as { importSource?: string; sourceId?: string };
        return meta.sourceId === filters.sourceId || meta.importSource === filters.sourceId || p.sourceFileName === filters.sourceId;
      } catch {
        return p.sourceFileName === filters.sourceId;
      }
    });
  }

  // Prioritize: images, description, stock, noindex false
  products.sort((a, b) => computePriorityScore(b as ProductBundle) - computePriorityScore(a as ProductBundle));

  return { products: products as ProductBundle[], totalCandidates, warnings };
}

async function loadExistingBlueprintMap(projectId: string) {
  const all = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId },
    select: { id: true, pageType: true, metadataJson: true },
  });
  const map = new Map<string, string>();
  for (const bp of all) {
    try {
      const m = JSON.parse(bp.metadataJson || "{}") as {
        productUniverseId?: string;
        productId?: string;
        generationSource?: string;
      };
      const pid = m.productUniverseId || m.productId;
      if (!pid) continue;
      if (m.generationSource !== BATCH_GENERATION_SOURCE && m.generationSource !== "PRODUCT_UNIVERSE_V2") continue;
      map.set(`${pid}:${bp.pageType}`, bp.id);
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

function resolveBlueprintTypes(
  product: ProductBundle,
  filters: BlueprintBatchFilters
): BlueprintTypeSlug[] {
  if (filters.blueprintTypes?.length) return filters.blueprintTypes;
  const types = defaultBlueprintTypes(product);
  if (filters.includeGeo) types.push("product_geo");
  return types;
}

export async function estimateBlueprintBatch(
  filters: BlueprintBatchFilters,
  opts: { dealerId?: string | null; isAdmin?: boolean }
): Promise<{ totalCandidates: number; estimatedBlueprints: number; warnings: string[] }> {
  const { products, totalCandidates, warnings } = await loadCandidates(filters, opts);
  let estimated = 0;
  for (const p of products) {
    estimated += resolveBlueprintTypes(p, filters).length;
    if (filters.includeGeo) {
      /* geo counted in types */
    }
  }
  return { totalCandidates, estimatedBlueprints: estimated, warnings };
}

export async function previewBlueprintBatch(
  filters: BlueprintBatchFilters,
  opts: { dealerId?: string | null; isAdmin?: boolean }
): Promise<BlueprintBatchPreviewResult> {
  const { products, totalCandidates, warnings } = await loadCandidates(filters, opts);
  const projectId = filters.projectId;
  const existingMap = projectId ? await loadExistingBlueprintMap(projectId) : new Map<string, string>();
  const slugSet = projectId ? await loadExistingSlugs(projectId) : new Set<string>();

  let estimatedBlueprints = 0;
  let duplicateCount = 0;
  let skippedProducts = 0;
  const byBlueprintType: Record<string, number> = {};
  const sampleBlueprints: SampleBlueprint[] = [];

  for (const product of products) {
    const types = resolveBlueprintTypes(product, filters);
    const drafts = await buildDraftsForProduct(product, types, slugSet, !!filters.includeGeo);

    if (!drafts.length) {
      skippedProducts += 1;
      continue;
    }

    for (const d of drafts) {
      const pageType = PAGE_TYPE_MAP[d.blueprintType as BlueprintTypeSlug];
      estimatedBlueprints += 1;
      byBlueprintType[d.blueprintType] = (byBlueprintType[d.blueprintType] || 0) + 1;

      if (projectId && existingMap.has(`${product.id}:${pageType}`)) {
        duplicateCount += 1;
      }

      if (sampleBlueprints.length < BATCH_LIMITS.previewSampleSize) {
        sampleBlueprints.push(d);
      }
    }
  }

  if (totalCandidates > BATCH_LIMITS.planOnlyThreshold) {
    warnings.push("10K+ aday — batch plan-only mod önerilir");
  }

  return {
    totalCandidates,
    eligibleProducts: products.length - skippedProducts,
    skippedProducts,
    estimatedBlueprints,
    duplicateCount,
    byBlueprintType,
    sampleBlueprints,
    warnings,
    planOnly: totalCandidates > BATCH_LIMITS.planOnlyThreshold,
  };
}

export async function generateBlueprintBatch(
  filters: BlueprintBatchFilters,
  opts: { dealerId?: string | null; isAdmin?: boolean }
): Promise<BlueprintBatchGenerateResult> {
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

  const duplicateMode: DuplicateMode =
    filters.duplicateMode === "update" ? "update" : "skip";

  const preview = await previewBlueprintBatch(filters, opts);
  const { products } = await loadCandidates(filters, opts);

  let jobId = "dry-run";
  if (!filters.dryRun) {
    const job = await prisma.productUniverseBlueprintJob.create({
      data: {
        dealerId: opts.dealerId || null,
        projectId: projectId || null,
        status: "RUNNING",
        filtersJson: JSON.stringify(filters),
        totalCandidates: preview.totalCandidates,
      },
    });
    jobId = job.id;
  }

  const existingMap = projectId ? await loadExistingBlueprintMap(projectId) : new Map<string, string>();
  const slugSet = projectId ? await loadExistingSlugs(projectId) : new Set<string>();

  let generatedCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const errors: Array<{ productId: string; message: string }> = [];
  const warnings = [...preview.warnings];
  const chunkSize = BATCH_LIMITS.chunkSize;

  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    for (const product of chunk) {
      try {
        const types = resolveBlueprintTypes(product, filters);
        const drafts = await buildDraftsForProduct(product, types, slugSet, !!filters.includeGeo);

        for (const draft of drafts) {
          const pageType = PAGE_TYPE_MAP[draft.blueprintType as BlueprintTypeSlug];
          const dupKey = `${product.id}:${pageType}`;
          const existingId = existingMap.get(dupKey);

          if (existingId) {
            duplicateCount += 1;
            if (duplicateMode === "skip") {
              skippedCount += 1;
              continue;
            }
            if (filters.dryRun) {
              generatedCount += 1;
              continue;
            }
            await prisma.pageFactoryBlueprint.update({
              where: { id: existingId },
              data: {
                title: draft.title,
                pageType,
                hierarchyLevel: HIERARCHY[draft.blueprintType as BlueprintTypeSlug],
                clusterPath: draft.metadata.category ? `Product > ${draft.metadata.category}` : "Product",
                metadataJson: JSON.stringify({
                  ...draft.metadata,
                  createdByBatchJobId: jobId,
                }),
              },
            });
            generatedCount += 1;
            continue;
          }

          if (filters.dryRun) {
            generatedCount += 1;
            continue;
          }

          await prisma.pageFactoryBlueprint.create({
            data: {
              projectId: projectId!,
              title: draft.title,
              pageType,
              hierarchyLevel: HIERARCHY[draft.blueprintType as BlueprintTypeSlug],
              clusterPath: draft.metadata.category ? `Product > ${draft.metadata.category}` : "Product",
              metadataJson: JSON.stringify({
                ...draft.metadata,
                slug: draft.slug,
                targetQuery: draft.targetQuery,
                intent: draft.intent,
                geoTarget: draft.geoTarget,
                priorityScore: draft.priorityScore,
                createdByBatchJobId: jobId,
              }),
            },
          });
          existingMap.set(dupKey, "new");
          generatedCount += 1;
        }
      } catch (e) {
        errorCount += 1;
        errors.push({
          productId: product.id,
          message: e instanceof Error ? e.message : "Blueprint üretim hatası",
        });
      }
    }
  }

  const resultPayload = {
    generatedCount,
    skippedCount,
    duplicateCount,
    errorCount,
    warnings,
    errors,
    dryRun: !!filters.dryRun,
  };

  if (!filters.dryRun && jobId !== "dry-run") {
    await prisma.productUniverseBlueprintJob.update({
      where: { id: jobId },
      data: {
        status: errorCount > 0 && generatedCount === 0 ? "FAILED" : "COMPLETED",
        generatedCount,
        skippedCount,
        duplicateCount,
        errorCount,
        resultJson: JSON.stringify(resultPayload),
      },
    });
  }

  return {
    jobId,
    totalCandidates: preview.totalCandidates,
    eligibleProducts: preview.eligibleProducts,
    generatedCount,
    skippedCount,
    duplicateCount,
    errorCount,
    warnings,
    errors,
    dryRun: !!filters.dryRun,
  };
}

export async function getBlueprintBatchJobs(opts: {
  dealerId?: string | null;
  page?: number;
  limit?: number;
}) {
  const page = opts.page || 1;
  const limit = Math.min(50, opts.limit || 20);
  const where = opts.dealerId ? { dealerId: opts.dealerId } : {};

  const [items, total] = await Promise.all([
    prisma.productUniverseBlueprintJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.productUniverseBlueprintJob.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getBlueprintBatchJob(id: string, dealerId?: string | null) {
  const job = await prisma.productUniverseBlueprintJob.findUnique({ where: { id } });
  if (!job) return null;
  if (dealerId && job.dealerId && job.dealerId !== dealerId) return null;
  return job;
}
