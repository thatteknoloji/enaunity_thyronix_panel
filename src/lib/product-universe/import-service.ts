import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import type { ProductUniverseSourceType } from "@prisma/client";
import { generateContentDNA } from "./content-dna-engine";
import { extractProductEntities } from "./entity-extractor";
import { harvestProductImages } from "./image-harvester";
import { parseImportFile, parseProductRows, type ParsedProductRow } from "./import-parser";
import {
  type DuplicateMode,
  type ImportCommitOptions,
  type ImportPreviewResult,
  type PreviewRowSample,
  ROW_LIMITS,
  toPrismaSourceType,
  userMappingToProductMapping,
} from "./import-types";
import { analyzeDescription } from "./description-cleaner";
import { buildDuplicateKeys } from "./product-normalizer";
import { calculateQualityScore } from "./quality-score";

export const IMPORT_SOURCE_TYPES = [
  "TRENDYOL_EXCEL",
  "SUPPLIER_EXCEL",
  "CSV",
  "JSON",
  "XLSX",
  "MANUAL",
  "TRENDYOL",
] as const;

export type ImportSourceType = (typeof IMPORT_SOURCE_TYPES)[number];

export type ImportOptions = {
  dealerId?: string | null;
  isAdmin?: boolean;
  projectId?: string | null;
  sourceType: ProductUniverseSourceType | string;
  fileName: string;
  dryRun?: boolean;
  downloadImages?: boolean;
  mapping?: Record<string, string>;
  duplicateMode?: DuplicateMode;
  runAnalysis?: boolean;
  limit?: number;
  minQuality?: number;
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
  errors?: string[];
};

function getMaxRows(isAdmin?: boolean): number {
  return isAdmin ? ROW_LIMITS.adminMax : ROW_LIMITS.dealerMax;
}

function resolveCustomMapping(mapping?: Record<string, string>) {
  if (!mapping) return undefined;
  if (mapping.name || mapping.stockCode || mapping.imageColumns) {
    return {
      ...mapping,
      imageColumns: mapping.imageColumns
        ? String(mapping.imageColumns).split(",").map((s) => s.trim())
        : undefined,
    };
  }
  return userMappingToProductMapping(mapping);
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
        productUrl: (() => {
          try {
            const meta = product.metadataJson ? JSON.parse(product.metadataJson) : {};
            return meta.productUrl;
          } catch {
            return undefined;
          }
        })(),
      }),
    },
  });
}

async function findExistingProduct(dealerId: string | null | undefined, row: ParsedProductRow) {
  const scope = dealerId ? { dealerId } : {};

  if (row.stockCode) {
    const bySku = await prisma.productUniverse.findFirst({
      where: { stockCode: row.stockCode, ...scope },
    });
    if (bySku) return bySku;
  }

  if (row.barcode) {
    const byBarcode = await prisma.productUniverse.findFirst({
      where: { barcode: row.barcode, ...scope },
    });
    if (byBarcode) return byBarcode;
  }

  const byNameBrand = await prisma.productUniverse.findFirst({
    where: {
      normalizedName: row.normalizedName,
      brand: row.brand || "",
      ...scope,
    },
  });
  if (byNameBrand) return byNameBrand;

  if (row.imageUrls[0]) {
    const byImage = await prisma.productUniverse.findFirst({
      where: {
        normalizedName: row.normalizedName,
        images: { some: { sourceUrl: row.imageUrls[0] } },
        ...scope,
      },
    });
    if (byImage) return byImage;
  }

  return prisma.productUniverse.findFirst({
    where: {
      normalizedName: row.normalizedName,
      brand: row.brand || "",
      categoryPath: row.categoryPath || "",
      ...scope,
    },
  });
}

function buildPreviewRow(
  row: ParsedProductRow,
  opts: {
    duplicateInFile: boolean;
    duplicateInDb: boolean;
    descriptionDuplicateOf?: string;
  }
): PreviewRowSample {
  const descWarnings = analyzeDescription(row.descriptionRaw, row.descriptionClean, {
    duplicateOf: opts.descriptionDuplicateOf,
  });
  const rowWarnings: string[] = [...descWarnings];
  if (!row.imageUrls.length) rowWarnings.push("Görsel yok");
  if (!row.price && row.stock == null) rowWarnings.push("Fiyat ve stok bilgisi yok");

  const quality = calculateQualityScore({
    rawName: row.rawName,
    categoryPath: row.categoryPath,
    descriptionClean: row.descriptionClean,
    imageCount: row.imageUrls.length,
    entityCount: 0,
    hasMaterialOrSize: false,
    isDuplicate: opts.duplicateInFile || opts.duplicateInDb,
  });

  return {
    rowIndex: row.rowIndex,
    rawName: row.rawName,
    normalizedName: row.normalizedName,
    brand: row.brand,
    barcode: row.barcode,
    stockCode: row.stockCode,
    categoryPath: row.categoryPath,
    descriptionRaw: row.descriptionRaw.slice(0, 200),
    descriptionClean: row.descriptionClean.slice(0, 200),
    descriptionWarnings: descWarnings,
    price: row.price,
    currency: row.currency,
    stock: row.stock,
    productUrl: row.productUrl,
    imageUrls: row.imageUrls.slice(0, 5),
    imageCount: row.imageUrls.length,
    qualityScore: quality.score,
    status: quality.status,
    duplicateKey: row.duplicateKey,
    isDuplicateInFile: opts.duplicateInFile,
    isDuplicateInDb: opts.duplicateInDb,
    rowWarnings,
  };
}

export async function previewProductImport(
  buffer: Buffer,
  fileName: string,
  opts: {
    dealerId?: string | null;
    isAdmin?: boolean;
    mapping?: Record<string, string>;
  }
): Promise<ImportPreviewResult> {
  const rawRows = parseImportFile(buffer, fileName);
  const maxRows = getMaxRows(opts.isAdmin);
  if (rawRows.length > maxRows) {
    throw new Error(`Dosya çok büyük: ${rawRows.length} satır (max ${maxRows})`);
  }

  const parsed = parseProductRows(rawRows, resolveCustomMapping(opts.mapping));
  const fileDuplicateKeys = new Map<string, number>();
  const descriptionHashes = new Map<string, number>();
  let imageUrlCount = 0;
  let blueprintReadyEstimate = 0;
  let analyzedEstimate = 0;
  let rejectedEstimate = 0;
  let duplicateInFile = 0;
  let duplicateInDb = 0;

  const dbCheckCache = new Map<string, boolean>();

  const previewRows: PreviewRowSample[] = [];

  for (const row of parsed.rows) {
    imageUrlCount += row.imageUrls.length;

    const keys = buildDuplicateKeys(row);
    const inFile = keys.some((k) => fileDuplicateKeys.has(k));
    if (inFile) duplicateInFile++;
    for (const k of keys) fileDuplicateKeys.set(k, (fileDuplicateKeys.get(k) || 0) + 1);

    let inDb = false;
    const existing = await findExistingProduct(opts.dealerId, row);
    inDb = !!existing;
    if (inDb) duplicateInDb++;
    for (const k of keys) dbCheckCache.set(k, inDb);

    const descKey = row.descriptionClean.toLowerCase().slice(0, 100);
    let descDup: string | undefined;
    if (descKey && descriptionHashes.has(descKey)) {
      descDup = `satır ${descriptionHashes.get(descKey)}`;
    }
    if (descKey) descriptionHashes.set(descKey, row.rowIndex);

    const sample = buildPreviewRow(row, {
      duplicateInFile: inFile,
      duplicateInDb: inDb,
      descriptionDuplicateOf: descDup,
    });

    if (sample.status === "BLUEPRINT_READY") blueprintReadyEstimate++;
    else if (sample.status === "ANALYZED") analyzedEstimate++;
    else rejectedEstimate++;

    if (previewRows.length < ROW_LIMITS.previewSample) {
      previewRows.push(sample);
    }
  }

  return {
    totalRows: rawRows.length,
    validRows: parsed.rows.length,
    errorRows: parsed.errors.length,
    duplicateInFile,
    duplicateInDb,
    imageUrlCount,
    blueprintReadyEstimate,
    analyzedEstimate,
    rejectedEstimate,
    columns: parsed.columns,
    mapping: parsed.mapping,
    columnMapping: parsed.columnMapping,
    detectedColumns: parsed.detectedColumns,
    previewRows,
    warnings: parsed.warnings,
    errors: parsed.errors,
  };
}

async function processImportRow(
  row: ParsedProductRow,
  opts: ImportCommitOptions & { sourceType: ProductUniverseSourceType; fileName: string },
  state: {
    duplicateKeys: Map<string, string>;
    duplicateMode: DuplicateMode;
  }
): Promise<"inserted" | "updated" | "skipped" | "error"> {
  const existing = await findExistingProduct(opts.dealerId, row);

  if (existing && state.duplicateMode === "skip") return "skipped";

  let productId: string;
  let isDuplicate = false;

  const meta = {
    productUrl: row.productUrl || undefined,
    stock: row.stock ?? undefined,
    importVersion: "PRODUCT_UNIVERSE_EXCEL_IMPORT_V2",
  };

  if (existing && state.duplicateMode === "update") {
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
        sourceFileName: opts.fileName,
        status: "NORMALIZED",
        metadataJson: JSON.stringify({
          ...(existing.metadataJson ? JSON.parse(existing.metadataJson) : {}),
          ...meta,
        }),
      },
    });
    productId = existing.id;
    if (row.imageUrls.length) {
      await prisma.productImage.deleteMany({ where: { productId } });
      await harvestProductImages({
        productId,
        imageUrls: row.imageUrls,
        downloadImages: opts.downloadImages,
      });
    }
    if (opts.runAnalysis !== false) await analyzeProduct(productId);
    return "updated";
  }

  if (existing && state.duplicateMode === "create_new") {
    // fall through to create
  } else if (existing) {
    return "skipped";
  }

  const dupKey = row.duplicateKey;
  let duplicateGroupId: string | null = null;
  if (state.duplicateKeys.has(dupKey)) {
    duplicateGroupId = state.duplicateKeys.get(dupKey)!;
    isDuplicate = true;
  } else {
    duplicateGroupId = `dup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    state.duplicateKeys.set(dupKey, duplicateGroupId);
  }

  const created = await prisma.productUniverse.create({
    data: {
      dealerId: opts.dealerId || null,
      projectId: opts.projectId || null,
      sourceType: opts.sourceType,
      sourceFileName: opts.fileName,
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
      metadataJson: JSON.stringify(meta),
    },
  });
  productId = created.id;

  if (row.imageUrls.length) {
    await harvestProductImages({
      productId,
      imageUrls: row.imageUrls,
      downloadImages: opts.downloadImages,
    });
  }

  if (opts.runAnalysis !== false) await analyzeProduct(productId);
  return "inserted";
}

export async function commitProductImport(
  buffer: Buffer,
  fileName: string,
  opts: ImportCommitOptions
): Promise<ImportResponse> {
  const rawRows = parseImportFile(buffer, fileName);
  const maxRows = getMaxRows(opts.isAdmin);
  if (rawRows.length > maxRows) {
    throw new Error(`Dosya çok büyük: ${rawRows.length} satır (max ${maxRows})`);
  }

  const limit = opts.limit ?? ROW_LIMITS.defaultCommit;
  const rowsToProcess = rawRows.slice(0, limit);

  const parsed = parseProductRows(rowsToProcess, resolveCustomMapping(opts.mapping));
  const sourceType = toPrismaSourceType(opts.sourceType) as ProductUniverseSourceType;
  const duplicateMode = opts.duplicateMode || "skip";

  if (opts.dryRun) {
    const preview = await previewProductImport(buffer, fileName, {
      dealerId: opts.dealerId,
      isAdmin: opts.isAdmin,
      mapping: opts.mapping,
    });
    return {
      jobId: "dry-run",
      totalRows: preview.totalRows,
      insertedRows: preview.validRows,
      updatedRows: 0,
      skippedRows: preview.duplicateInDb,
      errorRows: preview.errorRows,
      sampleProducts: preview.previewRows.slice(0, 5).map((r) => ({
        rawName: r.rawName,
        normalizedName: r.normalizedName,
        brand: r.brand,
        categoryPath: r.categoryPath,
        qualityScore: r.qualityScore,
        status: r.status,
      })),
      detectedColumns: preview.detectedColumns,
      warnings: preview.warnings,
    };
  }

  const job = await prisma.productUniverseImportJob.create({
    data: {
      dealerId: opts.dealerId || null,
      projectId: opts.projectId || null,
      sourceType,
      status: "RUNNING",
      fileName: opts.fileName || fileName,
      totalRows: parsed.rows.length,
      metadataJson: JSON.stringify({
        duplicateMode,
        limit,
        version: "PRODUCT_UNIVERSE_EXCEL_IMPORT_V2",
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
  const jobErrors: string[] = [];
  const jobWarnings = [...parsed.warnings];
  const duplicateKeys = new Map<string, string>();

  try {
    for (const row of parsed.rows) {
      try {
        const result = await processImportRow(
          row,
          {
            ...opts,
            sourceType,
            fileName: opts.fileName || fileName,
          },
          { duplicateKeys, duplicateMode }
        );

        if (result === "inserted") insertedRows++;
        else if (result === "updated") updatedRows++;
        else if (result === "skipped") skippedRows++;

        if (sampleProducts.length < 5 && result !== "skipped" && result !== "error") {
          const p = await prisma.productUniverse.findFirst({
            where: { normalizedName: row.normalizedName, stockCode: row.stockCode || undefined },
            orderBy: { createdAt: "desc" },
          });
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
        const msg = `Satır ${row.rowIndex}: ${e instanceof Error ? e.message : "Hata"}`;
        jobErrors.push(msg);
        jobWarnings.push(msg);
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
          duplicateMode,
          limit,
          version: "PRODUCT_UNIVERSE_EXCEL_IMPORT_V2",
          detectedColumns: parsed.detectedColumns,
          warnings: jobWarnings,
          errors: jobErrors,
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
          errors: jobErrors,
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
    warnings: jobWarnings,
    errors: jobErrors,
  };
}

/** @deprecated Use commitProductImport — kept for backward compat */
export async function runProductImport(
  buffer: Buffer,
  fileName: string,
  opts: ImportOptions
): Promise<ImportResponse> {
  return commitProductImport(buffer, fileName, {
    dealerId: opts.dealerId,
    isAdmin: opts.isAdmin,
    projectId: opts.projectId,
    sourceType: opts.sourceType,
    fileName: opts.fileName,
    dryRun: opts.dryRun,
    downloadImages: opts.downloadImages,
    mapping: opts.mapping,
    duplicateMode: opts.duplicateMode || (opts.dryRun ? "skip" : "update"),
    runAnalysis: opts.runAnalysis ?? !opts.dryRun,
    limit: opts.limit,
    minQuality: opts.minQuality,
  });
}

export function generateImportTemplateBuffer(): Buffer {
  const headers = [
    "productName",
    "sku",
    "brand",
    "category",
    "description",
    "price",
    "stock",
    "currency",
    "image1",
    "image2",
    "image3",
    "productUrl",
  ];
  const sample = [
    {
      productName: "Örnek Ürün Adı",
      sku: "SKU-001",
      brand: "Örnek Marka",
      category: "Ev & Yaşam > Dekorasyon",
      description: "Ürün açıklaması buraya yazılır.",
      price: 299.9,
      stock: 50,
      currency: "TRY",
      image1: "https://example.com/image1.jpg",
      image2: "https://example.com/image2.jpg",
      image3: "",
      productUrl: "https://example.com/urun",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ürünler");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
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

export async function listImportTemplates(dealerId?: string | null) {
  return prisma.productUniverseImportTemplate.findMany({
    where: dealerId ? { OR: [{ dealerId }, { dealerId: null }] } : {},
    orderBy: { updatedAt: "desc" },
  });
}

export async function saveImportTemplate(opts: {
  dealerId?: string | null;
  name: string;
  sourceType: string;
  mappingJson: string;
}) {
  return prisma.productUniverseImportTemplate.create({
    data: {
      dealerId: opts.dealerId || null,
      name: opts.name,
      sourceType: opts.sourceType,
      mappingJson: opts.mappingJson,
    },
  });
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
