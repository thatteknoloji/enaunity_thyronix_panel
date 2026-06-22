import { prisma } from "@/lib/db";
import type { ProductUniverse } from "@prisma/client";
import { analyzeProduct } from "./import-service";
import { harvestProductImages } from "./image-harvester";
import { calculateQualityScore } from "./quality-score";
import {
  completeThyronixBridgeJob,
  createThyronixBridgeJob,
  failThyronixBridgeJob,
  getLatestThyronixBridgeJob,
  type ThyronixBridgeJobMetadata,
} from "./thyronix-import-job";
import {
  mapThyronixProductToUniverse,
  THYRONIX_BRIDGE_IMPORT_SOURCE,
  type ThyronixBridgeMappedProduct,
} from "./thyronix-product-mapper";

export type ThyronixBridgeImportOptions = {
  sourceIds?: string[];
  onlyActiveSources?: boolean;
  dryRun?: boolean;
  limit?: number;
  minStock?: number;
  analyze?: boolean;
  dealerId?: string | null;
  cursor?: string | null;
};

export type ThyronixBridgeImportResult = {
  jobId: string;
  totalRows: number;
  processedRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  sampleProducts: Array<{
    rawName: string;
    normalizedName: string;
    brand: string;
    categoryPath: string;
    qualityScore?: number;
    status?: string;
  }>;
  sourceSummary: Array<{ sourceId: string; sourceName: string; processed: number; total?: number }>;
  warnings: string[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type ThyronixBridgeStatus = {
  activeSourceCount: number;
  totalThyronixProducts: number;
  bridgedProductCount: number;
  blueprintReadyCount: number;
  analyzedCount: number;
  rejectedCount: number;
  sources: Array<{
    id: string;
    name: string;
    status: string;
    productCount: number;
    lastSync: string | null;
  }>;
  lastJob: {
    id: string;
    status: string;
    fileName: string;
    totalRows: number;
    insertedRows: number;
    updatedRows: number;
    skippedRows: number;
    errorRows: number;
    createdAt: string;
    completedAt: string | null;
    dryRun: boolean;
  } | null;
};

async function resolveSourceIds(opts: ThyronixBridgeImportOptions): Promise<string[]> {
  if (opts.sourceIds?.length) return opts.sourceIds;

  const sources = await prisma.thyronixSource.findMany({
    where: opts.onlyActiveSources !== false ? { status: "active" } : {},
    select: { id: true },
    orderBy: { name: "asc" },
  });
  return sources.map((s) => s.id);
}

async function findExistingBridgedProduct(
  mapped: ThyronixBridgeMappedProduct,
  dealerId?: string | null,
): Promise<ProductUniverse | null> {
  const scope = dealerId ? { dealerId } : {};

  const byThyronixId = await prisma.productUniverse.findFirst({
    where: {
      ...scope,
      metadataJson: { contains: `"thyronixProductId":"${mapped.thyronixProductId}"` },
    },
  });
  if (byThyronixId) return byThyronixId;

  if (mapped.barcode) {
    const byBarcode = await prisma.productUniverse.findFirst({
      where: { ...scope, barcode: mapped.barcode },
    });
    if (byBarcode) return byBarcode;
  }

  if (mapped.stockCode) {
    const byStock = await prisma.productUniverse.findFirst({
      where: { ...scope, stockCode: mapped.stockCode },
    });
    if (byStock) return byStock;
  }

  return prisma.productUniverse.findFirst({
    where: {
      ...scope,
      normalizedName: mapped.normalizedName,
      brand: mapped.brand || "",
      categoryPath: mapped.categoryPath || "",
    },
  });
}

async function upsertBridgedProduct(
  mapped: ThyronixBridgeMappedProduct,
  existing: ProductUniverse | null,
  opts: { dealerId?: string | null; analyze: boolean },
): Promise<{ productId: string; inserted: boolean }> {
  const baseData = {
    sourceType: "XML" as const,
    sourceFileName: mapped.sourceFileName,
    rawName: mapped.rawName,
    normalizedName: mapped.normalizedName,
    slug: mapped.slug,
    brand: mapped.brand,
    barcode: mapped.barcode || "",
    stockCode: mapped.stockCode || "",
    categoryPath: mapped.categoryPath,
    descriptionRaw: mapped.descriptionRaw,
    descriptionClean: mapped.descriptionClean,
    price: mapped.price,
    currency: mapped.currency,
    metadataJson: JSON.stringify(mapped.metadata),
    status: "NORMALIZED" as const,
  };

  let productId: string;
  let inserted = false;

  if (existing) {
    const mergedMeta = {
      ...(existing.metadataJson ? JSON.parse(existing.metadataJson) : {}),
      ...mapped.metadata,
    };
    await prisma.productUniverse.update({
      where: { id: existing.id },
      data: {
        ...baseData,
        metadataJson: JSON.stringify(mergedMeta),
      },
    });
    productId = existing.id;
  } else {
    const created = await prisma.productUniverse.create({
      data: {
        ...baseData,
        dealerId: opts.dealerId || null,
      },
    });
    productId = created.id;
    inserted = true;
  }

  if (mapped.imageUrls.length) {
    await prisma.productImage.deleteMany({ where: { productId } });
    await harvestProductImages({
      productId,
      imageUrls: mapped.imageUrls,
      downloadImages: false,
    });
  }

  if (opts.analyze) {
    await analyzeProduct(productId);
  }

  return { productId, inserted };
}

export async function runThyronixBridgeImport(
  opts: ThyronixBridgeImportOptions,
): Promise<ThyronixBridgeImportResult> {
  const limit = Math.min(5000, Math.max(1, opts.limit ?? 1000));
  const minStock = Math.max(0, opts.minStock ?? 0);
  const analyze = opts.analyze !== false;
  const dryRun = !!opts.dryRun;
  const sourceIds = await resolveSourceIds(opts);

  if (!sourceIds.length) {
    throw new Error("Aktif Thyronix kaynağı bulunamadı");
  }

  const productWhere = {
    sourceId: { in: sourceIds },
    stock: { gte: minStock },
    status: "active",
    ...(opts.cursor ? { id: { gt: opts.cursor } } : {}),
  };

  const [batch, totalRows] = await Promise.all([
    prisma.thyronixProduct.findMany({
      where: productWhere,
      include: { source: { select: { id: true, name: true } } },
      orderBy: { id: "asc" },
      take: limit + 1,
    }),
    prisma.thyronixProduct.count({
      where: {
        sourceId: { in: sourceIds },
        stock: { gte: minStock },
        status: "active",
      },
    }),
  ]);

  const hasMore = batch.length > limit;
  const products = hasMore ? batch.slice(0, limit) : batch;
  const nextCursor = hasMore && products.length ? products[products.length - 1]!.id : null;

  const jobMetadata: ThyronixBridgeJobMetadata = {
    bridgeType: "THYRONIX_BRIDGE_V1",
    sourceIds,
    dryRun,
    minStock,
    onlyActiveSources: opts.onlyActiveSources !== false,
    analyze,
    limit,
    sampleErrors: [],
    sourceSummary: [],
    cursor: opts.cursor || null,
    hasMore,
  };

  const sourceNames =
    products.length > 0
      ? [...new Set(products.map((p) => p.source.name))]
      : (
          await prisma.thyronixSource.findMany({
            where: { id: { in: sourceIds } },
            select: { name: true },
          })
        ).map((s) => s.name);

  const job = dryRun
    ? null
    : await createThyronixBridgeJob({
        sourceIds,
        sourceNames,
        dryRun,
        minStock,
        onlyActiveSources: opts.onlyActiveSources !== false,
        analyze,
        limit,
        totalRows,
        dealerId: opts.dealerId,
      });

  let insertedRows = 0;
  let updatedRows = 0;
  let skippedRows = 0;
  let errorRows = 0;
  const sampleProducts: ThyronixBridgeImportResult["sampleProducts"] = [];
  const warnings: string[] = [];
  const sourceSummaryMap = new Map<string, { sourceId: string; sourceName: string; processed: number }>();

  try {
    for (const product of products) {
      const summaryKey = product.sourceId;
      const summary = sourceSummaryMap.get(summaryKey) || {
        sourceId: product.source.id,
        sourceName: product.source.name,
        processed: 0,
      };

      try {
        const mapped = mapThyronixProductToUniverse(product, product.source);

        if (dryRun) {
          const existing = await findExistingBridgedProduct(mapped, opts.dealerId);
          const quality = calculateQualityScore({
            rawName: mapped.rawName,
            categoryPath: mapped.categoryPath,
            descriptionClean: mapped.descriptionClean,
            imageCount: mapped.imageUrls.length,
            entityCount: 0,
            hasMaterialOrSize: false,
            isDuplicate: false,
          });
          if (existing) updatedRows++;
          else insertedRows++;
          summary.processed++;
          if (sampleProducts.length < 5) {
            sampleProducts.push({
              rawName: mapped.rawName,
              normalizedName: mapped.normalizedName,
              brand: mapped.brand,
              categoryPath: mapped.categoryPath,
              qualityScore: quality.score,
              status: quality.status,
            });
          }
          sourceSummaryMap.set(summaryKey, summary);
          continue;
        }

        const existing = await findExistingBridgedProduct(mapped, opts.dealerId);
        const { inserted } = await upsertBridgedProduct(mapped, existing, {
          dealerId: opts.dealerId,
          analyze,
        });

        if (inserted) insertedRows++;
        else updatedRows++;

        summary.processed++;

        if (sampleProducts.length < 5) {
          const saved = await prisma.productUniverse.findFirst({
            where: {
              metadataJson: { contains: `"thyronixProductId":"${mapped.thyronixProductId}"` },
            },
          });
          if (saved) {
            sampleProducts.push({
              rawName: saved.rawName,
              normalizedName: saved.normalizedName,
              brand: saved.brand,
              categoryPath: saved.categoryPath,
              qualityScore: saved.qualityScore,
              status: saved.status,
            });
          }
        }
      } catch (e) {
        errorRows++;
        const msg = `${product.name}: ${e instanceof Error ? e.message : "Hata"}`;
        warnings.push(msg);
        if ((jobMetadata.sampleErrors?.length || 0) < 10) {
          jobMetadata.sampleErrors!.push(msg);
        }
      }

      sourceSummaryMap.set(summaryKey, summary);
    }

    jobMetadata.sourceSummary = [...sourceSummaryMap.values()];
    jobMetadata.hasMore = hasMore;
    jobMetadata.cursor = nextCursor;

    if (job) {
      await completeThyronixBridgeJob(job.id, {
        insertedRows,
        updatedRows,
        skippedRows,
        errorRows,
        metadata: jobMetadata,
      });
    }

    return {
      jobId: job?.id || `dry-${Date.now()}`,
      totalRows,
      processedRows: products.length,
      insertedRows,
      updatedRows,
      skippedRows,
      errorRows,
      sampleProducts,
      sourceSummary: [...sourceSummaryMap.values()],
      warnings,
      hasMore,
      nextCursor,
    };
  } catch (e) {
    if (job) {
      await failThyronixBridgeJob(
        job.id,
        e instanceof Error ? e.message : "Bridge import failed",
        jobMetadata,
      );
    }
    throw e;
  }
}

export async function getThyronixBridgeStatus(): Promise<ThyronixBridgeStatus> {
  const activeSources = await prisma.thyronixSource.findMany({
    where: { status: "active" },
    select: {
      id: true,
      name: true,
      status: true,
      productCount: true,
      lastSync: true,
    },
    orderBy: { name: "asc" },
  });

  const activeSourceIds = activeSources.map((s) => s.id);

  const bridgeWhere = {
    metadataJson: { contains: `"importSource":"${THYRONIX_BRIDGE_IMPORT_SOURCE}"` },
  };

  const [totalThyronixProducts, bridgedProductCount, blueprintReadyCount, analyzedCount, rejectedCount, lastJob] =
    await Promise.all([
      activeSourceIds.length
        ? prisma.thyronixProduct.count({
            where: { sourceId: { in: activeSourceIds }, status: "active" },
          })
        : 0,
      prisma.productUniverse.count({ where: bridgeWhere }),
      prisma.productUniverse.count({
        where: { ...bridgeWhere, status: "BLUEPRINT_READY" },
      }),
      prisma.productUniverse.count({
        where: { ...bridgeWhere, status: "ANALYZED" },
      }),
      prisma.productUniverse.count({
        where: { ...bridgeWhere, status: "REJECTED" },
      }),
      getLatestThyronixBridgeJob(),
    ]);

  let lastJobParsed: ThyronixBridgeStatus["lastJob"] = null;
  if (lastJob) {
    let meta: ThyronixBridgeJobMetadata | null = null;
    try {
      meta = JSON.parse(lastJob.metadataJson || "{}") as ThyronixBridgeJobMetadata;
    } catch {
      meta = null;
    }
    lastJobParsed = {
      id: lastJob.id,
      status: lastJob.status,
      fileName: lastJob.fileName,
      totalRows: lastJob.totalRows,
      insertedRows: lastJob.insertedRows,
      updatedRows: lastJob.updatedRows,
      skippedRows: lastJob.skippedRows,
      errorRows: lastJob.errorRows,
      createdAt: lastJob.createdAt.toISOString(),
      completedAt: lastJob.completedAt?.toISOString() || null,
      dryRun: !!meta?.dryRun,
    };
  }

  return {
    activeSourceCount: activeSources.length,
    totalThyronixProducts,
    bridgedProductCount,
    blueprintReadyCount,
    analyzedCount,
    rejectedCount,
    sources: activeSources.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      productCount: s.productCount,
      lastSync: s.lastSync?.toISOString() || null,
    })),
    lastJob: lastJobParsed,
  };
}
