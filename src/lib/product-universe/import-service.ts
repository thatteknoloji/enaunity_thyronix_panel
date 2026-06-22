import { prisma } from "@/lib/db";
import type { ProductUniverseSourceType } from "@prisma/client";
import { generateContentDNA } from "./content-dna-engine";
import { extractProductEntities } from "./entity-extractor";
import { harvestProductImages } from "./image-harvester";
import { parseImportFile, parseProductRows, type ParsedProductRow } from "./import-parser";
import { calculateQualityScore } from "./quality-score";

export const IMPORT_SOURCE_TYPES = ["TRENDYOL", "CSV", "XLSX", "MANUAL"] as const;
export type ImportSourceType = (typeof IMPORT_SOURCE_TYPES)[number];

export type ImportOptions = {
  dealerId?: string | null;
  projectId?: string | null;
  sourceType: ProductUniverseSourceType;
  fileName: string;
  dryRun?: boolean;
  downloadImages?: boolean;
  mapping?: Record<string, string>;
};

export type ImportResponse = {
  jobId: string;
  totalRows: number;
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
  detectedColumns: Record<string, string | string[]>;
  warnings: string[];
};

function toSourceType(type: string): ProductUniverseSourceType {
  const upper = type.toUpperCase();
  const valid = ["TRENDYOL", "HEPSIBURADA", "N11", "CSV", "XLSX", "XML", "SHOPIFY", "WOOCOMMERCE", "MANUAL"];
  if (valid.includes(upper)) return upper as ProductUniverseSourceType;
  return "CSV";
}

export async function analyzeProduct(productId: string): Promise<void> {
  const product = await prisma.productUniverse.findUnique({
    where: { id: productId },
    include: { entities: true, attributes: true, images: true, contentDNA: true },
  });
  if (!product) throw new Error("Ürün bulunamadı");

  await prisma.productEntity.deleteMany({ where: { productId } });
  await prisma.productAttribute.deleteMany({ where: { productId } });

  const { entities, attributes } = extractProductEntities({
    rawName: product.rawName,
    normalizedName: product.normalizedName,
    descriptionClean: product.descriptionClean,
    categoryPath: product.categoryPath,
    brand: product.brand,
  });

  if (entities.length) {
    await prisma.productEntity.createMany({
      data: entities.map((e) => ({
        productId,
        type: e.type,
        value: e.value,
        confidence: e.confidence,
      })),
    });
  }

  if (attributes.length) {
    await prisma.productAttribute.createMany({
      data: attributes.map((a) => ({
        productId,
        key: a.key,
        value: a.value,
        unit: a.unit,
        confidence: a.confidence,
      })),
    });
  }

  const updatedEntities = await prisma.productEntity.findMany({ where: { productId } });
  const updatedAttrs = await prisma.productAttribute.findMany({ where: { productId } });
  const images = await prisma.productImage.findMany({ where: { productId } });

  const dna = generateContentDNA({
    product,
    entities: updatedEntities,
    attributes: updatedAttrs,
    images,
  });

  await prisma.productContentDNA.upsert({
    where: { productId },
    create: {
      productId,
      primaryEntity: dna.primaryEntity,
      targetKeyword: dna.targetKeyword,
      intent: dna.intent,
      audience: dna.audience,
      pageAngle: dna.pageAngle,
      faqSeedsJson: JSON.stringify(dna.faqSeeds),
      internalLinkHintsJson: JSON.stringify(dna.internalLinkHints),
      schemaHintsJson: JSON.stringify(dna.schemaHints),
    },
    update: {
      primaryEntity: dna.primaryEntity,
      targetKeyword: dna.targetKeyword,
      intent: dna.intent,
      audience: dna.audience,
      pageAngle: dna.pageAngle,
      faqSeedsJson: JSON.stringify(dna.faqSeeds),
      internalLinkHintsJson: JSON.stringify(dna.internalLinkHints),
      schemaHintsJson: JSON.stringify(dna.schemaHints),
    },
  });

  const isDuplicate = !!product.duplicateGroupId;
  const quality = calculateQualityScore({
    rawName: product.rawName,
    categoryPath: product.categoryPath,
    descriptionClean: product.descriptionClean,
    imageCount: images.length,
    entityCount: updatedEntities.length,
    hasMaterialOrSize: updatedAttrs.some((a) => a.key === "material" || a.key === "size"),
    isDuplicate,
  });

  await prisma.productUniverse.update({
    where: { id: productId },
    data: {
      qualityScore: quality.score,
      status: quality.status,
      metadataJson: JSON.stringify({
        ...(product.metadataJson ? JSON.parse(product.metadataJson) : {}),
        qualityWarnings: quality.warnings,
      }),
    },
  });
}

async function findExistingProduct(
  dealerId: string | null | undefined,
  row: ParsedProductRow
) {
  if (row.barcode) {
    const byBarcode = await prisma.productUniverse.findFirst({
      where: {
        barcode: row.barcode,
        ...(dealerId ? { dealerId } : {}),
      },
    });
    if (byBarcode) return byBarcode;
  }

  return prisma.productUniverse.findFirst({
    where: {
      normalizedName: row.normalizedName,
      brand: row.brand || "",
      categoryPath: row.categoryPath || "",
      ...(dealerId ? { dealerId } : {}),
    },
  });
}

export async function runProductImport(
  buffer: Buffer,
  fileName: string,
  opts: ImportOptions
): Promise<ImportResponse> {
  const rows = parseImportFile(buffer, fileName);
  const customMapping = opts.mapping
    ? {
        ...opts.mapping,
        imageColumns: opts.mapping.imageColumns
          ? String(opts.mapping.imageColumns).split(",").map((s) => s.trim())
          : undefined,
      }
    : undefined;

  const parsed = parseProductRows(rows, customMapping);
  const sourceType = toSourceType(opts.sourceType);

  const job = await prisma.productUniverseImportJob.create({
    data: {
      dealerId: opts.dealerId || null,
      projectId: opts.projectId || null,
      sourceType,
      status: "RUNNING",
      fileName: opts.fileName || fileName,
      totalRows: parsed.rows.length,
      metadataJson: JSON.stringify({
        dryRun: !!opts.dryRun,
        detectedColumns: parsed.detectedColumns,
        warnings: parsed.warnings,
      }),
    },
  });

  let insertedRows = 0;
  let updatedRows = 0;
  let skippedRows = 0;
  let errorRows = parsed.errors.length;
  const sampleProducts: ImportResponse["sampleProducts"] = [];
  const duplicateKeys = new Map<string, string>();

  try {
    for (const row of parsed.rows) {
      try {
        if (opts.dryRun) {
          const quality = calculateQualityScore({
            rawName: row.rawName,
            categoryPath: row.categoryPath,
            descriptionClean: row.descriptionClean,
            imageCount: row.imageUrls.length,
            entityCount: 0,
            hasMaterialOrSize: false,
            isDuplicate: duplicateKeys.has(row.duplicateKey),
          });

          if (!duplicateKeys.has(row.duplicateKey)) {
            duplicateKeys.set(row.duplicateKey, row.normalizedName);
          } else {
            quality.score = Math.max(0, quality.score - 20);
          }

          if (sampleProducts.length < 5) {
            sampleProducts.push({
              rawName: row.rawName,
              normalizedName: row.normalizedName,
              brand: row.brand,
              categoryPath: row.categoryPath,
              qualityScore: quality.score,
              status: quality.status,
            });
          }
          insertedRows++;
          continue;
        }

        const existing = await findExistingProduct(opts.dealerId, row);
        let productId: string;
        let isDuplicate = false;

        if (existing) {
          await prisma.productUniverse.update({
            where: { id: existing.id },
            data: {
              rawName: row.rawName,
              normalizedName: row.normalizedName,
              brand: row.brand,
              barcode: row.barcode,
              stockCode: row.stockCode,
              categoryPath: row.categoryPath,
              descriptionRaw: row.descriptionRaw,
              descriptionClean: row.descriptionClean,
              price: row.price,
              currency: row.currency,
              sourceFileName: opts.fileName || fileName,
              status: "NORMALIZED",
            },
          });
          productId = existing.id;
          updatedRows++;
        } else {
          const dupKey = row.duplicateKey;
          let duplicateGroupId: string | null = null;
          if (duplicateKeys.has(dupKey)) {
            duplicateGroupId = duplicateKeys.get(dupKey)!;
            isDuplicate = true;
          } else {
            duplicateGroupId = `dup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            duplicateKeys.set(dupKey, duplicateGroupId);
          }

          const created = await prisma.productUniverse.create({
            data: {
              dealerId: opts.dealerId || null,
              projectId: opts.projectId || null,
              sourceType,
              sourceFileName: opts.fileName || fileName,
              rawName: row.rawName,
              normalizedName: row.normalizedName,
              slug: row.slug,
              brand: row.brand,
              barcode: row.barcode,
              stockCode: row.stockCode,
              categoryPath: row.categoryPath,
              descriptionRaw: row.descriptionRaw,
              descriptionClean: row.descriptionClean,
              price: row.price,
              currency: row.currency,
              status: "NORMALIZED",
              duplicateGroupId: isDuplicate ? duplicateGroupId : null,
            },
          });
          productId = created.id;
          insertedRows++;
        }

        if (row.imageUrls.length) {
          await prisma.productImage.deleteMany({ where: { productId } });
          await harvestProductImages({
            productId,
            imageUrls: row.imageUrls,
            downloadImages: opts.downloadImages,
          });
        }

        await analyzeProduct(productId);

        if (sampleProducts.length < 5) {
          const p = await prisma.productUniverse.findUnique({ where: { id: productId } });
          if (p) {
            sampleProducts.push({
              rawName: p.rawName,
              normalizedName: p.normalizedName,
              brand: p.brand,
              categoryPath: p.categoryPath,
              qualityScore: p.qualityScore,
              status: p.status,
            });
          }
        }
      } catch (e) {
        errorRows++;
        parsed.warnings.push(`Satır ${row.rowIndex}: ${e instanceof Error ? e.message : "Hata"}`);
      }
    }

    await prisma.productUniverseImportJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        insertedRows,
        updatedRows,
        skippedRows,
        errorRows,
        completedAt: new Date(),
        metadataJson: JSON.stringify({
          dryRun: !!opts.dryRun,
          detectedColumns: parsed.detectedColumns,
          warnings: parsed.warnings,
        }),
      },
    });
  } catch (e) {
    await prisma.productUniverseImportJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorRows,
        completedAt: new Date(),
        metadataJson: JSON.stringify({
          error: e instanceof Error ? e.message : "Import failed",
        }),
      },
    });
    throw e;
  }

  return {
    jobId: job.id,
    totalRows: parsed.rows.length,
    insertedRows,
    updatedRows,
    skippedRows,
    errorRows,
    sampleProducts,
    detectedColumns: parsed.detectedColumns,
    warnings: [...parsed.warnings, ...parsed.errors.map((e) => `Satır ${e.row}: ${e.message}`)],
  };
}

export async function listImportJobs(opts: {
  dealerId?: string | null;
  page?: number;
  limit?: number;
}) {
  const page = opts.page || 1;
  const limit = Math.min(50, opts.limit || 20);
  const where = opts.dealerId ? { dealerId: opts.dealerId } : {};

  const [items, total] = await Promise.all([
    prisma.productUniverseImportJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.productUniverseImportJob.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getProductUniverseStats(dealerId?: string | null) {
  const where = dealerId ? { dealerId } : {};
  const [total, analyzed, withImages, clusters, lowQuality] = await Promise.all([
    prisma.productUniverse.count({ where }),
    prisma.productUniverse.count({
      where: { ...where, status: { in: ["ANALYZED", "BLUEPRINT_READY"] } },
    }),
    prisma.productUniverse.count({
      where: { ...where, images: { some: {} } },
    }),
    prisma.productCluster.count({ where: dealerId ? { dealerId } : {} }),
    prisma.productUniverse.count({
      where: { ...where, qualityScore: { lt: 40 } },
    }),
  ]);

  return { total, analyzed, withImages, clusters, lowQuality };
}
