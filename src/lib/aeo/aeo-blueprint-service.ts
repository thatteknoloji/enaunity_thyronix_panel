import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/auth/admin-access";
import type { AeoBlueprintPayload, AeoBulkFilters } from "./aeo-types";
import { generateAnswerBlocks } from "./answer-block-engine";
import { generateCitationHints } from "./citation-hint-engine";
import { generateFaqBlocks } from "./faq-block-engine";
import { generateGeoHints } from "./geo-answer-engine";
import { generateSchemaHints } from "./schema-hint-engine";
import { calculateAeoQualityScore } from "./aeo-quality-score";
import {
  isSensitiveCategory,
  parseMetadata,
  resolveBlueprintKind,
  type AeoProductContext,
} from "./aeo-utils";

export type AeoGenerateResult = {
  blueprintId: string;
  dryRun: boolean;
  payload: AeoBlueprintPayload;
  written: boolean;
};

export type AeoBulkResult = {
  processed: number;
  written: number;
  skipped: number;
  dryRun: boolean;
  results: Array<{ blueprintId: string; aeoQualityScore: number; written: boolean }>;
  errors: Array<{ blueprintId: string; message: string }>;
};

async function loadBlueprintContext(blueprintId: string) {
  const blueprint = await prisma.pageFactoryBlueprint.findUnique({
    where: { id: blueprintId },
    include: { project: true },
  });
  if (!blueprint) throw new Error("Blueprint bulunamadı");

  const metadata = parseMetadata(blueprint.metadataJson);
  const productId = metadata.productId as string | undefined;
  if (!productId) throw new Error("Blueprint productId içermiyor — Product Universe blueprinti değil");

  const product = await prisma.productUniverse.findUnique({
    where: { id: productId },
    include: {
      entities: true,
      attributes: true,
      images: true,
      contentDNA: true,
    },
  });
  if (!product) throw new Error("Ürün bulunamadı");

  return { blueprint, metadata, product, project: blueprint.project };
}

function buildProductContext(product: Awaited<ReturnType<typeof loadBlueprintContext>>["product"]): AeoProductContext {
  return {
    product,
    entities: product.entities,
    attributes: product.attributes,
    images: product.images,
    contentDNA: product.contentDNA,
  };
}

function parseInternalLinks(metadata: Record<string, unknown>) {
  const raw = metadata.internalLinkHints;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      anchor: String(x.anchor || ""),
      targetType: String(x.targetType || ""),
      targetKeyword: String(x.targetKeyword || ""),
      priority: Number(x.priority) || 0,
    }))
    .filter((x) => x.anchor);
}

export function buildAeoPayload(
  ctx: AeoProductContext,
  blueprint: { id: string; pageType: string; title: string },
  metadata: Record<string, unknown>,
  projectCountry?: string | null
): AeoBlueprintPayload {
  const blueprintKind = resolveBlueprintKind(metadata, blueprint.pageType);
  const citationHints = generateCitationHints(ctx, metadata);
  const faqBlocks = generateFaqBlocks(ctx, blueprintKind, metadata, citationHints);
  const geoHints = generateGeoHints(ctx, blueprintKind, metadata, projectCountry);
  const hasLocation = !!(geoHints.province || geoHints.district);
  const schemaHints = generateSchemaHints(blueprintKind, ctx, metadata, hasLocation);
  const answerBlocks = generateAnswerBlocks(ctx, blueprintKind, metadata, faqBlocks, geoHints.geoAnswerBlocks);

  const noindexRecommended = metadata.noindexRecommended === true;
  const aeoQualityScore = calculateAeoQualityScore({
    answerBlocks,
    faqBlocks,
    schemaHints,
    citationHints,
    entityCount: ctx.entities.length,
    hasImage: ctx.images.length > 0,
    hasDescriptionClean: !!ctx.product.descriptionClean?.trim(),
    noindexRecommended,
  });

  return {
    version: "AEO_LAYER_V1",
    productId: ctx.product.id,
    productName: ctx.product.normalizedName,
    blueprintType: blueprintKind,
    primaryIntent: (metadata.intent as string) || ctx.contentDNA?.intent || "commercial",
    targetQuery: (metadata.targetKeyword as string) || ctx.contentDNA?.targetKeyword || ctx.product.normalizedName.toLowerCase(),
    answerBlocks,
    faqBlocks,
    schemaHints,
    geoHints,
    citationHints,
    internalLinkHints: parseInternalLinks(metadata),
    aeoQualityScore,
    noindexRecommended,
    sensitiveCategoryWarning: isSensitiveCategory(ctx.product.categoryPath),
    generatedAt: new Date().toISOString(),
  };
}

export async function previewAeoForBlueprint(blueprintId: string): Promise<AeoBlueprintPayload> {
  const { blueprint, metadata, product, project } = await loadBlueprintContext(blueprintId);
  const ctx = buildProductContext(product);
  return buildAeoPayload(ctx, blueprint, metadata, project.country);
}

export async function generateAeoForBlueprint(blueprintId: string, dryRun = false): Promise<AeoGenerateResult> {
  const { blueprint, metadata, product, project } = await loadBlueprintContext(blueprintId);
  const ctx = buildProductContext(product);
  const payload = buildAeoPayload(ctx, blueprint, metadata, project.country);

  if (dryRun) {
    return { blueprintId, dryRun: true, payload, written: false };
  }

  const nextMetadata = {
    ...metadata,
    contentStatus: metadata.contentStatus === "NOT_GENERATED" || !metadata.contentStatus
      ? "AEO_READY"
      : metadata.contentStatus,
    aeo: payload,
  };

  await prisma.pageFactoryBlueprint.update({
    where: { id: blueprintId },
    data: { metadataJson: JSON.stringify(nextMetadata) },
  });

  return { blueprintId, dryRun: false, payload, written: true };
}

export async function getAeoForBlueprint(blueprintId: string): Promise<AeoBlueprintPayload | null> {
  const { metadata } = await loadBlueprintContext(blueprintId);
  const aeo = metadata.aeo as AeoBlueprintPayload | undefined;
  return aeo?.version === "AEO_LAYER_V1" ? aeo : null;
}

export async function assertBlueprintAccess(
  blueprintId: string,
  user: { role: string; dealerId?: string | null }
) {
  const ctx = await loadBlueprintContext(blueprintId);
  if (!isAdminRole(user.role) && ctx.project.dealerId && ctx.project.dealerId !== user.dealerId) {
    throw new Error("Bu blueprinte erişim yetkiniz yok");
  }
  return ctx;
}

function matchesAeoFilter(metadata: Record<string, unknown>, filters: AeoBulkFilters): boolean {
  const aeo = metadata.aeo as AeoBlueprintPayload | undefined;
  const hasAeo = aeo?.version === "AEO_LAYER_V1";

  if (filters.aeoStatus === "missing" && hasAeo) return false;
  if (filters.aeoStatus === "ready" && !hasAeo) return false;
  if (filters.aeoStatus === "low" && (!hasAeo || (aeo.aeoQualityScore ?? 0) >= 50)) return false;

  if (filters.minAeoScore != null && hasAeo && (aeo.aeoQualityScore ?? 0) < filters.minAeoScore) return false;

  return true;
}

export async function generateBulkAeoForBlueprints(
  projectId: string,
  filters: AeoBulkFilters = {}
): Promise<AeoBulkResult> {
  const limit = Math.min(filters.limit ?? 100, 500);
  const dryRun = filters.dryRun ?? false;

  const all = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
    take: limit * 3,
  });

  const matched = all.filter((bp) => {
    const metadata = parseMetadata(bp.metadataJson);
    if (filters.generationSource && metadata.generationSource !== filters.generationSource) return false;
    if (filters.blueprintType && metadata.blueprintKind !== filters.blueprintType) return false;
    if (filters.minQualityScore != null) {
      const qs = Number(metadata.qualityScore ?? 0);
      if (qs < filters.minQualityScore) return false;
    }
    if (!matchesAeoFilter(metadata, filters)) return false;
    return !!metadata.productId;
  }).slice(0, limit);

  const result: AeoBulkResult = {
    processed: 0,
    written: 0,
    skipped: 0,
    dryRun,
    results: [],
    errors: [],
  };

  for (const bp of matched) {
    result.processed++;
    try {
      const gen = await generateAeoForBlueprint(bp.id, dryRun);
      result.results.push({
        blueprintId: bp.id,
        aeoQualityScore: gen.payload.aeoQualityScore,
        written: gen.written,
      });
      if (gen.written) result.written++;
    } catch (e) {
      result.skipped++;
      result.errors.push({
        blueprintId: bp.id,
        message: e instanceof Error ? e.message : "Bilinmeyen hata",
      });
    }
  }

  return result;
}
