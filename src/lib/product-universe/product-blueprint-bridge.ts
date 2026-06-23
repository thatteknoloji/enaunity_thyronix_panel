import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { BATCH_GENERATION_SOURCE } from "./blueprint-batch-types";
import type {
  ProductAttribute,
  ProductContentDNA,
  ProductEntity,
  ProductImage,
  ProductUniverse,
} from "@prisma/client";

export const GENERATION_SOURCE = "PRODUCT_UNIVERSE_V2" as const;
export const MAX_SINGLE_REQUEST = 1000;
export const PLAN_ONLY_THRESHOLD = 100_000;
export const DEFAULT_MIN_QUALITY = 70;

export type BlueprintKind =
  | "PRODUCT_DETAIL"
  | "PRODUCT_CATEGORY"
  | "PRODUCT_INTENT"
  | "PRODUCT_GEO"
  | "PRODUCT_FAQ"
  | "PRODUCT_GUIDE"
  | "PRODUCT_BENEFIT"
  | "PRODUCT_PROBLEM"
  | "PRODUCT_COMPARISON"
  | "PRODUCT_ALTERNATIVE";

export type ProductBlueprintBridgeOptions = {
  projectId: string;
  includeProductPage?: boolean;
  includeCategoryPage?: boolean;
  includeIntentPages?: boolean;
  includeGeoFusion?: boolean;
  includeFaqPage?: boolean;
  selectedProvinceIds?: string[];
  selectedDistrictIds?: string[];
  maxGenerate?: number;
  minQualityScore?: number;
  dryRun?: boolean;
  batchSize?: number;
  isAdmin?: boolean;
};

export type InternalLinkHint = {
  anchor: string;
  targetType: string;
  targetKeyword: string;
  priority: number;
};

export type BlueprintDraft = {
  kind: BlueprintKind;
  title: string;
  pageType: string;
  hierarchyLevel: number;
  clusterPath: string;
  slug: string;
  metadata: Record<string, unknown>;
};

export type BridgePreviewResult = {
  productId: string;
  productName: string;
  qualityScore: number;
  canSave: boolean;
  previewOnly: boolean;
  estimatedTotal: number;
  drafts: BlueprintDraft[];
  warnings: string[];
  duplicateWarnings: string[];
  planOnly?: boolean;
  generationPlan?: string;
};

export type BridgeGenerateResult = {
  productId: string;
  inserted: number;
  updated: number;
  skipped: number;
  warnings: string[];
  duplicateWarnings: string[];
  drafts: BlueprintDraft[];
};

export type BulkGenerateResult = {
  totalProducts: number;
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ productId: string; message: string }>;
  warnings: string[];
  dryRun: boolean;
  planOnly?: boolean;
  generationPlan?: string;
};

type ProductBundle = ProductUniverse & {
  entities: ProductEntity[];
  attributes: ProductAttribute[];
  images: ProductImage[];
  contentDNA: ProductContentDNA | null;
};

type GeoTarget = { id: string; name: string; path: string; level: "province" | "district" };

const HIERARCHY: Record<BlueprintKind, number> = {
  PRODUCT_GEO: 1,
  PRODUCT_INTENT: 2,
  PRODUCT_FAQ: 2,
  PRODUCT_GUIDE: 2,
  PRODUCT_BENEFIT: 2,
  PRODUCT_PROBLEM: 2,
  PRODUCT_COMPARISON: 2,
  PRODUCT_ALTERNATIVE: 2,
  PRODUCT_CATEGORY: 3,
  PRODUCT_DETAIL: 4,
};

const PAGE_TYPE_MAP: Record<BlueprintKind, string> = {
  PRODUCT_DETAIL: "product_detail",
  PRODUCT_CATEGORY: "product_category",
  PRODUCT_INTENT: "product_intent",
  PRODUCT_GEO: "product_geo",
  PRODUCT_FAQ: "product_faq",
  PRODUCT_GUIDE: "product_guide",
  PRODUCT_BENEFIT: "product_benefit",
  PRODUCT_PROBLEM: "product_problem",
  PRODUCT_COMPARISON: "product_comparison",
  PRODUCT_ALTERNATIVE: "product_alternative",
};

const SAMPLE_PROVINCE_NAMES = ["İstanbul", "Ankara", "İzmir"];

function parseJsonArray(json: string): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function resolveMaxGenerate(opts: ProductBlueprintBridgeOptions): number {
  const requested = opts.maxGenerate ?? (opts.isAdmin ? 500 : 100);
  const cap = opts.isAdmin ? 1000 : 200;
  return Math.min(requested, cap, MAX_SINGLE_REQUEST);
}

async function loadProductBundle(productId: string): Promise<ProductBundle | null> {
  return prisma.productUniverse.findUnique({
    where: { id: productId },
    include: {
      entities: true,
      attributes: true,
      images: true,
      contentDNA: true,
    },
  });
}

async function assertProjectAccess(projectId: string, dealerId?: string | null) {
  const project = await prisma.pageFactoryProject.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Proje bulunamadı");
  if (dealerId && project.dealerId && project.dealerId !== dealerId) {
    throw new Error("Bu projeye erişim yetkiniz yok");
  }
  return project;
}

async function uniqueSlug(base: string, existing: Set<string>): Promise<string> {
  let slug = slugify(base) || "blueprint";
  let n = 0;
  while (existing.has(slug)) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  existing.add(slug);
  return slug;
}

function shouldNoindex(product: ProductBundle): boolean {
  if (product.qualityScore < 70) return true;
  if (product.duplicateGroupId) return true;
  if (!product.descriptionClean?.trim()) return true;
  if (!product.images.length) return true;
  if (!product.entities.length) return true;
  return false;
}

function qualityGate(score: number, minQuality: number): { allowed: boolean; previewOnly: boolean; reason?: string } {
  if (score < 40) return { allowed: false, previewOnly: true, reason: "Kalite skoru 40 altı — blueprint üretilemez" };
  if (score < minQuality) return { allowed: true, previewOnly: true, reason: "Kalite skoru yetersiz — sadece önizleme" };
  return { allowed: true, previewOnly: false };
}

async function resolveGeoTargets(opts: ProductBlueprintBridgeOptions): Promise<GeoTarget[]> {
  const targets: GeoTarget[] = [];

  if (opts.selectedDistrictIds?.length) {
    const districts = await prisma.geoDistrict.findMany({
      where: { id: { in: opts.selectedDistrictIds }, isActive: true },
      include: { province: { select: { name: true } } },
      take: 50,
    });
    for (const d of districts) {
      targets.push({
        id: d.id,
        name: d.name,
        path: `${d.province.name} > ${d.name}`,
        level: "district",
      });
    }
    return targets;
  }

  if (opts.selectedProvinceIds?.length) {
    const provinces = await prisma.geoProvince.findMany({
      where: { id: { in: opts.selectedProvinceIds }, isActive: true },
      take: 20,
    });
    for (const p of provinces) {
      targets.push({ id: p.id, name: p.name, path: p.name, level: "province" });
    }
    return targets;
  }

  const sample = await prisma.geoProvince.findMany({
    where: { name: { in: SAMPLE_PROVINCE_NAMES }, isActive: true },
    take: 3,
  });
  if (sample.length) {
    for (const p of sample) {
      targets.push({ id: p.id, name: p.name, path: p.name, level: "province" });
    }
    return targets;
  }

  const fallback = await prisma.geoProvince.findMany({ where: { isActive: true }, take: 3, orderBy: { plateCode: "asc" } });
  for (const p of fallback) {
    targets.push({ id: p.id, name: p.name, path: p.name, level: "province" });
  }
  return targets;
}

async function buildInternalLinkHints(
  product: ProductBundle,
  geoTargets: GeoTarget[],
  relatedProducts: ProductUniverse[]
): Promise<InternalLinkHint[]> {
  const hints: InternalLinkHint[] = [];
  const dna = product.contentDNA;
  let priority = 10;

  for (const label of parseJsonArray(dna?.internalLinkHintsJson || "[]")) {
    hints.push({
      anchor: label,
      targetType: "dna_hint",
      targetKeyword: label.toLowerCase(),
      priority: priority--,
    });
  }

  for (const e of product.entities) {
    if (["THEME", "MATERIAL", "SIZE", "CATEGORY"].includes(e.type)) {
      hints.push({
        anchor: `${e.value} tabloları`,
        targetType: `entity_${e.type.toLowerCase()}`,
        targetKeyword: `${e.value} tablo`,
        priority: 8,
      });
    }
  }

  if (product.categoryPath) {
    const cat = product.categoryPath.split(/[>/|]/).pop()?.trim();
    if (cat) {
      hints.push({
        anchor: cat,
        targetType: "category",
        targetKeyword: cat.toLowerCase(),
        priority: 7,
      });
    }
  }

  for (const rp of relatedProducts.slice(0, 5)) {
    hints.push({
      anchor: rp.normalizedName,
      targetType: "related_product",
      targetKeyword: rp.normalizedName.toLowerCase(),
      priority: 5,
    });
  }

  for (const geo of geoTargets.slice(0, 5)) {
    hints.push({
      anchor: `${geo.name} ${product.normalizedName}`,
      targetType: "product_geo",
      targetKeyword: `${geo.name} ${dna?.targetKeyword || product.normalizedName}`.toLowerCase(),
      priority: 4,
    });
  }

  const seen = new Set<string>();
  return hints
    .filter((h) => {
      const key = `${h.targetType}:${h.anchor}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

function buildClusterPath(parts: (string | undefined)[]): string {
  return ["Product", ...parts.filter(Boolean) as string[]].join(" > ");
}

function parseProductImportSource(product: ProductBundle): string | undefined {
  try {
    const meta = JSON.parse(product.metadataJson || "{}") as { importSource?: string };
    return meta.importSource || undefined;
  } catch {
    return undefined;
  }
}

function baseMetadata(
  product: ProductBundle,
  internalLinks: InternalLinkHint[],
  geoPath?: string
): Record<string, unknown> {
  const dna = product.contentDNA;
  const importSource = parseProductImportSource(product);
  return {
    generationSource: GENERATION_SOURCE,
    ...(importSource ? { importSource } : {}),
    productId: product.id,
    productSlug: product.slug,
    productName: product.normalizedName,
    sourceType: product.sourceType,
    brand: product.brand,
    categoryPath: product.categoryPath,
    primaryEntity: dna?.primaryEntity || product.normalizedName,
    targetKeyword: dna?.targetKeyword || product.normalizedName.toLowerCase(),
    intent: dna?.intent || "commercial",
    geoPath: geoPath || "",
    imageIds: product.images.map((i) => i.id),
    faqSeeds: parseJsonArray(dna?.faqSeedsJson || "[]"),
    internalLinkHints: internalLinks,
    schemaHints: parseJsonArray(dna?.schemaHintsJson || "[]"),
    contentStatus: "NOT_GENERATED",
    qualityScore: product.qualityScore,
    canonicalHint: `/urun/${product.slug}`,
    noindexRecommended: shouldNoindex(product),
    duplicateGroupId: product.duplicateGroupId,
  };
}

async function findRelatedProducts(product: ProductBundle): Promise<ProductUniverse[]> {
  const theme = product.entities.find((e) => e.type === "THEME")?.value;
  const material = product.entities.find((e) => e.type === "MATERIAL")?.value;

  const where: { id: { not: string }; dealerId?: string | null; OR?: object[] } = {
    id: { not: product.id },
  };
  if (product.dealerId) where.dealerId = product.dealerId;

  if (product.categoryPath) {
    return prisma.productUniverse.findMany({
      where: { ...where, categoryPath: product.categoryPath },
      take: 8,
      orderBy: { qualityScore: "desc" },
    });
  }

  if (theme || material) {
    return prisma.productUniverse.findMany({
      where: {
        ...where,
        entities: {
          some: {
            OR: [
              ...(theme ? [{ type: "THEME" as const, value: theme }] : []),
              ...(material ? [{ type: "MATERIAL" as const, value: material }] : []),
            ],
          },
        },
      },
      take: 8,
      orderBy: { qualityScore: "desc" },
    });
  }

  return [];
}

async function loadExistingProductBlueprints(projectId: string, productId: string) {
  const all = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId },
    select: { id: true, title: true, pageType: true, metadataJson: true },
  });
  return all.filter((bp) => {
    try {
      const m = JSON.parse(bp.metadataJson || "{}") as { productId?: string; generationSource?: string };
      return m.generationSource === GENERATION_SOURCE && m.productId === productId;
    } catch {
      return false;
    }
  });
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

async function loadExistingKeywords(projectId: string): Promise<Set<string>> {
  const all = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId },
    select: { metadataJson: true },
  });
  const keys = new Set<string>();
  for (const bp of all) {
    try {
      const m = JSON.parse(bp.metadataJson || "{}") as { targetKeyword?: string };
      if (m.targetKeyword) keys.add(m.targetKeyword.toLowerCase());
    } catch {
      /* skip */
    }
  }
  return keys;
}

async function buildDrafts(
  product: ProductBundle,
  opts: ProductBlueprintBridgeOptions,
  slugSet: Set<string>
): Promise<{ drafts: BlueprintDraft[]; warnings: string[]; duplicateWarnings: string[] }> {
  const warnings: string[] = [];
  const duplicateWarnings: string[] = [];
  const drafts: BlueprintDraft[] = [];
  const dna = product.contentDNA;
  const theme = product.entities.find((e) => e.type === "THEME")?.value;
  const material = product.entities.find((e) => e.type === "MATERIAL")?.value;
  const categoryLabel = product.categoryPath.split(/[>/|]/).pop()?.trim() || product.categoryPath;

  const geoTargets = opts.includeGeoFusion ? await resolveGeoTargets(opts) : [];
  const related = await findRelatedProducts(product);
  const internalLinks = await buildInternalLinkHints(product, geoTargets, related);
  const metaBase = baseMetadata(product, internalLinks);

  if (opts.includeProductPage !== false) {
    const slug = await uniqueSlug(`urun-${product.slug}`, slugSet);
    drafts.push({
      kind: "PRODUCT_DETAIL",
      title: product.normalizedName,
      pageType: PAGE_TYPE_MAP.PRODUCT_DETAIL,
      hierarchyLevel: HIERARCHY.PRODUCT_DETAIL,
      clusterPath: buildClusterPath([categoryLabel, material, theme]),
      slug,
      metadata: { ...metaBase, slug, blueprintKind: "PRODUCT_DETAIL" },
    });
  }

  if (opts.includeCategoryPage && product.categoryPath) {
    const slug = await uniqueSlug(`kategori-${slugify(categoryLabel)}`, slugSet);
    drafts.push({
      kind: "PRODUCT_CATEGORY",
      title: categoryLabel,
      pageType: PAGE_TYPE_MAP.PRODUCT_CATEGORY,
      hierarchyLevel: HIERARCHY.PRODUCT_CATEGORY,
      clusterPath: buildClusterPath([categoryLabel]),
      slug,
      metadata: {
        ...metaBase,
        slug,
        blueprintKind: "PRODUCT_CATEGORY",
        targetKeyword: categoryLabel.toLowerCase(),
      },
    });
  }

  if (opts.includeIntentPages && dna?.intent) {
    const slug = await uniqueSlug(`intent-${slugify(dna.primaryEntity)}-${dna.intent}`, slugSet);
    drafts.push({
      kind: "PRODUCT_INTENT",
      title: `${dna.primaryEntity} — ${dna.intent}`,
      pageType: PAGE_TYPE_MAP.PRODUCT_INTENT,
      hierarchyLevel: HIERARCHY.PRODUCT_INTENT,
      clusterPath: buildClusterPath([categoryLabel, dna.intent]),
      slug,
      metadata: {
        ...metaBase,
        slug,
        blueprintKind: "PRODUCT_INTENT",
        audience: dna.audience,
        pageAngle: dna.pageAngle,
      },
    });
  }

  if (opts.includeFaqPage !== false && dna) {
    const faqs = parseJsonArray(dna.faqSeedsJson);
    if (faqs.length) {
      const slug = await uniqueSlug(`faq-${product.slug}`, slugSet);
      drafts.push({
        kind: "PRODUCT_FAQ",
        title: `${product.normalizedName} — SSS`,
        pageType: PAGE_TYPE_MAP.PRODUCT_FAQ,
        hierarchyLevel: HIERARCHY.PRODUCT_FAQ,
        clusterPath: buildClusterPath([categoryLabel, "FAQ"]),
        slug,
        metadata: { ...metaBase, slug, blueprintKind: "PRODUCT_FAQ", faqSeeds: faqs },
      });
    }
  }

  if (opts.includeGeoFusion && geoTargets.length) {
    for (const geo of geoTargets) {
      const title = `${geo.name} ${dna?.primaryEntity || product.normalizedName}`;
      const slug = await uniqueSlug(`geo-${slugify(geo.name)}-${product.slug}`, slugSet);
      drafts.push({
        kind: "PRODUCT_GEO",
        title,
        pageType: PAGE_TYPE_MAP.PRODUCT_GEO,
        hierarchyLevel: HIERARCHY.PRODUCT_GEO,
        clusterPath: buildClusterPath([categoryLabel, theme, geo.path]),
        slug,
        metadata: {
          ...metaBase,
          slug,
          blueprintKind: "PRODUCT_GEO",
          geoPath: geo.path,
          geoId: geo.id,
          geoLevel: geo.level,
          targetKeyword: `${geo.name} ${dna?.targetKeyword || product.normalizedName}`.toLowerCase(),
        },
      });
    }
  }

  const maxGen = resolveMaxGenerate(opts);
  if (drafts.length > maxGen) {
    warnings.push(`${drafts.length} blueprint üretildi — maxGenerate (${maxGen}) ile sınırlandı`);
    drafts.splice(maxGen);
  }

  return { drafts, warnings, duplicateWarnings };
}

function estimateTotal(opts: ProductBlueprintBridgeOptions, geoCount: number): number {
  let total = 0;
  if (opts.includeProductPage !== false) total += 1;
  if (opts.includeCategoryPage && opts.projectId) total += 1;
  if (opts.includeIntentPages) total += 1;
  if (opts.includeFaqPage !== false) total += 1;
  if (opts.includeGeoFusion) total += geoCount || 3;
  return total;
}

export async function previewProductBlueprints(
  productId: string,
  options: ProductBlueprintBridgeOptions
): Promise<BridgePreviewResult> {
  const product = await loadProductBundle(productId);
  if (!product) throw new Error("Ürün bulunamadı");

  await assertProjectAccess(options.projectId);

  const minQuality = options.minQualityScore ?? DEFAULT_MIN_QUALITY;
  const gate = qualityGate(product.qualityScore, minQuality);
  const geoTargets = options.includeGeoFusion ? await resolveGeoTargets(options) : [];
  const estimatedTotal = estimateTotal(options, geoTargets.length);

  if (estimatedTotal > PLAN_ONLY_THRESHOLD) {
    return {
      productId,
      productName: product.normalizedName,
      qualityScore: product.qualityScore,
      canSave: false,
      previewOnly: true,
      estimatedTotal,
      drafts: [],
      warnings: ["100.000+ tahmin — sadece plan döndürüldü"],
      duplicateWarnings: [],
      planOnly: true,
      generationPlan: `Tahmini ${estimatedTotal.toLocaleString("tr-TR")} blueprint — batch üretim önerilir`,
    };
  }

  if (!gate.allowed) {
    return {
      productId,
      productName: product.normalizedName,
      qualityScore: product.qualityScore,
      canSave: false,
      previewOnly: true,
      estimatedTotal: 0,
      drafts: [],
      warnings: [gate.reason!],
      duplicateWarnings: [],
    };
  }

  const slugSet = await loadExistingSlugs(options.projectId);
  const existingKeywords = await loadExistingKeywords(options.projectId);
  const { drafts, warnings, duplicateWarnings } = await buildDrafts(product, options, slugSet);

  for (const d of drafts) {
    const kw = String(d.metadata.targetKeyword || "").toLowerCase();
    if (kw && existingKeywords.has(kw)) {
      duplicateWarnings.push(`Duplicate targetKeyword: ${kw}`);
    }
  }

  if (gate.previewOnly) warnings.push(gate.reason!);

  return {
    productId,
    productName: product.normalizedName,
    qualityScore: product.qualityScore,
    canSave: gate.allowed && !gate.previewOnly,
    previewOnly: gate.previewOnly || !!options.dryRun,
    estimatedTotal: drafts.length,
    drafts,
    warnings,
    duplicateWarnings,
  };
}

export async function generateProductBlueprints(
  productId: string,
  options: ProductBlueprintBridgeOptions
): Promise<BridgeGenerateResult> {
  const preview = await previewProductBlueprints(productId, options);

  if (preview.planOnly) {
    throw new Error(preview.generationPlan || "Plan-only mod — generate engellendi");
  }
  if (!preview.canSave || options.dryRun) {
    return {
      productId,
      inserted: 0,
      updated: 0,
      skipped: preview.drafts.length,
      warnings: [...preview.warnings, options.dryRun ? "Dry-run — kayıt yapılmadı" : "Kalite yetersiz — kayıt yapılmadı"],
      duplicateWarnings: preview.duplicateWarnings,
      drafts: preview.drafts,
    };
  }

  if (preview.drafts.length > MAX_SINGLE_REQUEST) {
    throw new Error(`${MAX_SINGLE_REQUEST} üstü blueprint — batchSize ile parçalayın`);
  }

  const existing = await loadExistingProductBlueprints(options.projectId, productId);
  const existingByType = new Map(existing.map((bp) => [bp.pageType, bp]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const warnings = [...preview.warnings];

  for (const draft of preview.drafts) {
    const prev = existingByType.get(draft.pageType);
    const data = {
      projectId: options.projectId,
      title: draft.title,
      pageType: draft.pageType,
      hierarchyLevel: draft.hierarchyLevel,
      clusterPath: draft.clusterPath,
      metadataJson: JSON.stringify(draft.metadata),
    };

    if (prev) {
      await prisma.pageFactoryBlueprint.update({ where: { id: prev.id }, data });
      updated += 1;
    } else {
      const slugConflict = await prisma.pageFactoryBlueprint.findMany({
        where: { projectId: options.projectId },
        select: { metadataJson: true },
      });
      const slugExists = slugConflict.some((bp) => {
        try {
          const m = JSON.parse(bp.metadataJson || "{}") as { slug?: string };
          return m.slug === draft.slug;
        } catch {
          return false;
        }
      });
      if (slugExists) {
        skipped += 1;
        warnings.push(`Slug çakışması — atlandı: ${draft.slug}`);
        continue;
      }
      await prisma.pageFactoryBlueprint.create({ data });
      inserted += 1;
    }
  }

  if (inserted > 0 || updated > 0) {
    await prisma.productUniverse.update({
      where: { id: productId },
      data: { status: "BLUEPRINT_READY" },
    });
  }

  return {
    productId,
    inserted,
    updated,
    skipped,
    warnings,
    duplicateWarnings: preview.duplicateWarnings,
    drafts: preview.drafts,
  };
}

export async function generateBulkProductBlueprints(
  productIds: string[],
  options: ProductBlueprintBridgeOptions
): Promise<BulkGenerateResult> {
  const maxGen = resolveMaxGenerate(options);
  const batchSize = Math.max(1, Math.min(options.batchSize ?? 50, 200));
  const uniqueIds = [...new Set(productIds)].slice(0, batchSize);

  if (productIds.length > MAX_SINGLE_REQUEST && !options.dryRun) {
    throw new Error(`${MAX_SINGLE_REQUEST} üstü ürün — batchSize ile parçalayın`);
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let processed = 0;
  const errors: BulkGenerateResult["errors"] = [];
  const warnings: string[] = [];
  let totalDrafts = 0;

  for (const productId of uniqueIds) {
    try {
      const result = await generateProductBlueprints(productId, {
        ...options,
        maxGenerate: Math.max(1, Math.floor(maxGen / uniqueIds.length)),
      });
      inserted += result.inserted;
      updated += result.updated;
      skipped += result.skipped;
      totalDrafts += result.drafts.length;
      warnings.push(...result.warnings);
      processed += 1;
      if (totalDrafts >= maxGen) {
        warnings.push(`maxGenerate (${maxGen}) limitine ulaşıldı`);
        break;
      }
    } catch (e) {
      errors.push({ productId, message: e instanceof Error ? e.message : "Hata" });
    }
  }

  return {
    totalProducts: productIds.length,
    processed,
    inserted,
    updated,
    skipped,
    errors,
    warnings,
    dryRun: !!options.dryRun,
  };
}

export async function listProductUniverseBlueprints(searchParams: URLSearchParams, dealerId?: string | null) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10) || 30));
  const projectId = searchParams.get("projectId")?.trim();
  const productId = searchParams.get("productId")?.trim();
  const pageType = searchParams.get("pageType")?.trim();
  const q = searchParams.get("q")?.trim();
  const contentStatus = searchParams.get("contentStatus")?.trim();
  const generationSource = searchParams.get("generationSource")?.trim();
  const sourceType = searchParams.get("sourceType")?.trim();
  const brand = searchParams.get("brand")?.trim();
  const batchJobId = searchParams.get("batchJobId")?.trim();

  const where = projectId ? { projectId } : {};
  const all = await prisma.pageFactoryBlueprint.findMany({
    where,
    orderBy: [{ hierarchyLevel: "desc" }, { title: "asc" }],
    include: { project: { select: { dealerId: true, name: true } } },
  });

  const filtered = all.filter((bp) => {
    let meta: Record<string, string> = {};
    try {
      meta = JSON.parse(bp.metadataJson || "{}") as Record<string, string>;
    } catch {
      return false;
    }
    const src = meta.generationSource;
    const isProductUniverse = src === GENERATION_SOURCE || src === BATCH_GENERATION_SOURCE;
    if (generationSource) {
      if (src !== generationSource) return false;
    } else if (!isProductUniverse) {
      return false;
    }
    if (sourceType && meta.sourceType !== sourceType) return false;
    if (brand && meta.brand !== brand) return false;
    if (batchJobId && meta.createdByBatchJobId !== batchJobId) return false;
    if (dealerId && bp.project.dealerId && bp.project.dealerId !== dealerId) return false;
    if (productId && meta.productId !== productId) return false;
    if (pageType && bp.pageType !== pageType) return false;
    if (contentStatus && meta.contentStatus !== contentStatus) return false;
    if (q && !bp.title.toLowerCase().includes(q.toLowerCase()) && !(meta.targetKeyword || "").includes(q.toLowerCase())) {
      return false;
    }
    return true;
  });

  const total = filtered.length;
  const items = filtered.slice((page - 1) * limit, page * limit).map((bp) => {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(bp.metadataJson || "{}");
    } catch {
      /* skip */
    }
    return {
      id: bp.id,
      projectId: bp.projectId,
      projectName: bp.project.name,
      title: bp.title,
      pageType: bp.pageType,
      hierarchyLevel: bp.hierarchyLevel,
      clusterPath: bp.clusterPath,
      metadata,
    };
  });

  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
