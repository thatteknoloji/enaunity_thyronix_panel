import { prisma } from "@/lib/db";
import { getTemplate } from "./templates";
import {
  buildParsedProductIdentity,
  ensureUniqueRowExternalId,
  fetchAndParseXmlFeeds,
  parseFixedValues,
  productToThyronixRow,
  resolveSourceFeedUrls,
} from "./feed-fetch";
import { parseExcel, mapExcelToProducts } from "./excel-parser";
import { parseCsvToProducts } from "./csv-parser";
import { loadMergedFeedProducts } from "./feed-output-service";
import { resolveFeedSourceIds } from "./source-feed-provision";
import {
  getMissingRequiredMappings,
  mappingErrorLabel,
  parseMappingRecord,
  validateSourceMappingConfig,
} from "./mapping-validation";

export type ThyronixSourceSyncResult = {
  sourceId: string;
  sourceName: string;
  type: string;
  total: number;
  created: number;
  updated: number;
  invalid?: number;
  duration: number;
  feeds?: Array<{ url: string; count: number; error?: string }>;
};

type ThyronixSourceSyncOptions = {
  fetchTimeoutMs?: number;
  refreshFeedTotals?: boolean;
  snapshot?: boolean;
};

async function preSnapshot(sourceId: string, sourceName: string) {
  try {
    const count = await prisma.thyronixProduct.count({ where: { sourceId } });
    if (count > 0) {
      const products = await prisma.thyronixProduct.findMany({
        where: { sourceId },
        take: 50000,
        select: { id: true, name: true, price: true, stock: true, brand: true, category: true, status: true, barcode: true },
      });
      await prisma.thyronixSnapshot.create({
        data: {
          label: `Pre-sync - ${sourceName}`,
          type: "sync",
          sourceId,
          productCount: count,
          activeCount: count,
          passiveCount: 0,
          errorCount: 0,
          warningCount: 0,
          snapshotData: JSON.stringify(products),
        },
      });
    }
  } catch {
    /* snapshot failure must not block source sync */
  }
}

async function postSnapshot(sourceId: string, sourceName: string, total: number, errorCount = 0) {
  try {
    await prisma.thyronixSnapshot.create({
      data: {
        label: `Post-sync - ${sourceName}`,
        type: "sync",
        sourceId,
        productCount: total,
        activeCount: total,
        passiveCount: 0,
        errorCount,
        warningCount: 0,
        snapshotData: "{}",
      },
    });
  } catch {
    /* snapshot failure must not block source sync */
  }
}

async function refreshDealerFeedTotals(dealerId: string | null) {
  if (!dealerId) return;
  try {
    const sourceIds = await resolveFeedSourceIds({ dealerId, sourceId: null });
    const feeds = await prisma.thyronixFeed.findMany({
      where: { dealerId, sourceId: null },
      select: { id: true, mergeStrategy: true, outputFormat: true, dealerId: true, sourceId: true },
    });
    for (const feed of feeds) {
      const merged = await loadMergedFeedProducts(feed as any, sourceIds);
      await prisma.thyronixFeed.update({
        where: { id: feed.id },
        data: { productCount: merged.length },
      });
    }
  } catch {
    /* feed total refresh is best-effort */
  }
}

function assertSourceMappingReady(
  sourceType: string,
  fieldMapping: Record<string, string>,
  variantMapping: Record<string, string>,
  fixedValues: Record<string, string>,
  templateFieldMap?: Record<string, string | undefined>,
) {
  const validation = validateSourceMappingConfig({
    sourceType,
    fieldMapping,
    variantMapping,
    fixedValues,
    templateFieldMap,
  });
  if (!validation.ready) {
    throw new Error(validation.errors.join(" · "));
  }
}

export function isThyronixSourceDue(source: { lastSync: Date | null; interval: number | null | undefined }, now = new Date()) {
  const intervalMinutes = 720;
  if (!source.lastSync) return true;
  return source.lastSync.getTime() + intervalMinutes * 60 * 1000 <= now.getTime();
}

export async function syncThyronixSourceById(
  sourceId: string,
  opts: ThyronixSourceSyncOptions = {},
): Promise<ThyronixSourceSyncResult> {
  const source = await prisma.thyronixSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("Kaynak bulunamadı");

  const fetchTimeoutMs = Math.max(10000, Math.min(opts.fetchTimeoutMs || 180000, 180000));
  const shouldRefreshFeedTotals = opts.refreshFeedTotals !== false;
  const shouldSnapshot = opts.snapshot !== false;
  const startTime = Date.now();
  const sourceType = (source as any).type || "xml";
  const url = (source as any).xmlUrl || source.xmlUrl;
  const customFieldMap = parseMappingRecord((source as any).fieldMapping);
  const variantFieldMap = parseMappingRecord((source as any).variantMapping);
  const fixedValues = parseFixedValues((source as any).fixedValues);
  const templateForValidation = sourceType === "xml" ? getTemplate((source as any).inputFormat || "custom_xml") : null;
  assertSourceMappingReady(sourceType, customFieldMap, variantFieldMap, fixedValues, templateForValidation?.fieldMap as any);

  if (shouldSnapshot) await preSnapshot(source.id, source.name);

  try {
    if (sourceType === "xml") {
      const formatId = (source as any).inputFormat || "custom_xml";
      const template = getTemplate(formatId);
      if (!template) throw new Error("Geçersiz format");
      const templateMapping = Object.fromEntries(
        Object.entries(template.fieldMap || {}).map(([target, xmlField]) => [String(xmlField), target]),
      );
      const missingXml = getMissingRequiredMappings({ ...templateMapping, ...customFieldMap });
      if (missingXml.length > 0) {
        throw new Error(`Eksik XML eşleştirme: ${missingXml.map(mappingErrorLabel).join(", ")}`);
      }

      const feedUrls = resolveSourceFeedUrls(url, (source as any).fixedValues);
      const { products, feedStats } = await fetchAndParseXmlFeeds(
        feedUrls,
        template,
        customFieldMap,
        variantFieldMap,
        fetchTimeoutMs,
      );
      const seen = new Set<string>();
      const usedExternalIds = new Set<string>();
      const allData: any[] = [];
      for (const p of products) {
        const identity = buildParsedProductIdentity(p);
        if (seen.has(identity)) continue;
        seen.add(identity);
        allData.push(ensureUniqueRowExternalId(productToThyronixRow(p, source.id, fixedValues), identity, usedExternalIds));
      }

      await prisma.thyronixProduct.deleteMany({ where: { sourceId: source.id } });
      const BATCH = 1000;
      for (let i = 0; i < allData.length; i += BATCH) {
        await prisma.thyronixProduct.createMany({ data: allData.slice(i, i + BATCH) });
      }

      if (shouldSnapshot) await postSnapshot(source.id, source.name, allData.length);
      const now = new Date();
      await prisma.thyronixSource.update({
        where: { id: source.id },
        data: { productCount: allData.length, lastSync: now, status: "active", errorLog: null } as any,
      });
      if (shouldRefreshFeedTotals) await refreshDealerFeedTotals(source.dealerId || null);
      await prisma.thyronixSyncLog.create({
        data: {
          type: "source-sync",
          referenceId: source.name,
          status: "success",
          message: `XML otomatik/manuel sync: ${allData.length} ürün`,
          productCount: allData.length,
          duration: Date.now() - startTime,
        },
      });

      return {
        sourceId: source.id,
        sourceName: source.name,
        type: sourceType,
        total: allData.length,
        created: allData.length,
        updated: 0,
        feeds: feedStats,
        duration: Date.now() - startTime,
      };
    }

    if (sourceType === "excel") {
      const fileRes = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!fileRes.ok) throw new Error(`Dosya indirilemedi: HTTP ${fileRes.status}`);
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      const sheetName = fixedValues._sheetName || undefined;
      const headerRow = parseInt(fixedValues._headerRow || "1", 10);
      const parsed = parseExcel(buffer, sheetName, headerRow);
      if (parsed.errors.length > 0) throw new Error(parsed.errors[0]);

      const products = mapExcelToProducts(parsed.allRows, customFieldMap, fixedValues, variantFieldMap);
      const valid = products.filter((p) => p.valid);
      const invalid = products.length - valid.length;
      const barcodes = valid.filter((p) => p.barcode).map((p) => p.barcode!);
      const stockCodes = valid.filter((p) => p.stockCode).map((p) => p.stockCode!);
      const modelCodes = valid.filter((p) => p.modelCode).map((p) => p.modelCode!);
      const externalIds = valid.filter((p) => p.externalId).map((p) => p.externalId!);

      const existingProducts = barcodes.length + stockCodes.length + modelCodes.length + externalIds.length > 0
        ? await prisma.thyronixProduct.findMany({
            where: {
              sourceId: source.id,
              OR: [
                ...(barcodes.length > 0 ? [{ barcode: { in: barcodes } }] : []),
                ...(stockCodes.length > 0 ? [{ stockCode: { in: stockCodes } }] : []),
                ...(modelCodes.length > 0 ? [{ modelCode: { in: modelCodes } }] : []),
                ...(externalIds.length > 0 ? [{ externalId: { in: externalIds } }] : []),
              ],
            },
            select: { id: true, barcode: true, stockCode: true, modelCode: true, externalId: true },
          })
        : [];

      const byBarcode = new Map(existingProducts.filter((e) => e.barcode).map((e) => [e.barcode!, e.id]));
      const byStockCode = new Map(existingProducts.filter((e) => e.stockCode).map((e) => [e.stockCode!, e.id]));
      const byModelCode = new Map(existingProducts.filter((e) => e.modelCode).map((e) => [e.modelCode!, e.id]));
      const byExternalId = new Map(existingProducts.filter((e) => e.externalId).map((e) => [e.externalId!, e.id]));

      const creates: any[] = [];
      const updates: { id: string; data: any }[] = [];
      for (const p of valid) {
        const existingId =
          (p.barcode && byBarcode.get(p.barcode)) ||
          (p.stockCode && byStockCode.get(p.stockCode)) ||
          (p.modelCode && byModelCode.get(p.modelCode)) ||
          (p.externalId && byExternalId.get(p.externalId)) ||
          undefined;
        const data = {
          name: p.productName,
          description: p.description || null,
          brand: p.brand || null,
          category: p.category || null,
          barcode: p.barcode || null,
          stockCode: p.stockCode || null,
          modelCode: p.modelCode || null,
          externalId: p.externalId || `EXCEL_${p.rowIndex}`,
          price: p.price,
          discountedPrice: p.discountedPrice ?? p.salePrice ?? null,
          costPrice: p.costPrice ?? null,
          stock: p.stock,
          currency: p.currency || "TRY",
          image: p.image || null,
          images: p.images || null,
          weight: p.weight ?? null,
          dimensions: p.dimensions || null,
          vatRate: p.vatRate ?? null,
          deliveryTime: p.deliveryTime || null,
          manufacturer: p.manufacturer || null,
          warranty: p.warranty || null,
          shippingCost: p.shippingCost ?? null,
          productUrl: p.productUrl || null,
          variantData: p.variantData || null,
          metadataJson: p.metadataJson || "{}",
          status: p.status || "active",
          sourceId: source.id,
        };

        if (existingId) updates.push({ id: existingId, data });
        else creates.push(data);
      }

      const BATCH = 500;
      for (let i = 0; i < creates.length; i += BATCH) {
        await prisma.thyronixProduct.createMany({ data: creates.slice(i, i + BATCH) as any });
      }
      for (let i = 0; i < updates.length; i += BATCH) {
        const batch = updates.slice(i, i + BATCH);
        await Promise.all(batch.map((u) => prisma.thyronixProduct.update({ where: { id: u.id }, data: u.data as any })));
      }

      const total = creates.length + updates.length;
      if (shouldSnapshot) await postSnapshot(source.id, source.name, total, invalid);
      await prisma.thyronixSource.update({
        where: { id: source.id },
        data: { productCount: total, lastSync: new Date(), status: "active", errorLog: null } as any,
      });
      if (shouldRefreshFeedTotals) await refreshDealerFeedTotals(source.dealerId || null);
      await prisma.thyronixSyncLog.create({
        data: {
          type: "source-sync",
          referenceId: source.name,
          status: "success",
          message: `Excel otomatik/manuel sync: ${creates.length} yeni, ${updates.length} güncelleme, ${invalid} hatalı`,
          productCount: total,
          duration: Date.now() - startTime,
        },
      });

      return { sourceId: source.id, sourceName: source.name, type: sourceType, total, created: creates.length, updated: updates.length, invalid, duration: Date.now() - startTime };
    }

    if (sourceType === "csv") {
      const csvRes = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!csvRes.ok) throw new Error(`HTTP ${csvRes.status}`);
      const csvText = await csvRes.text();
      const parsed = parseCsvToProducts(csvText, {
        delimiter: fixedValues._delimiter || undefined,
        hasHeader: fixedValues._hasHeader !== "false",
      });

      const barcodes = parsed.filter((p) => p.barcode).map((p) => p.barcode!);
      const stockCodes = parsed.filter((p) => p.stockCode).map((p) => p.stockCode!);
      const externalIds = parsed.filter((p) => p.externalId).map((p) => p.externalId!);
      const existingProducts = barcodes.length + stockCodes.length + externalIds.length > 0
        ? await prisma.thyronixProduct.findMany({
            where: {
              sourceId: source.id,
              OR: [
                ...(barcodes.length > 0 ? [{ barcode: { in: barcodes } }] : []),
                ...(stockCodes.length > 0 ? [{ stockCode: { in: stockCodes } }] : []),
                ...(externalIds.length > 0 ? [{ externalId: { in: externalIds } }] : []),
              ],
            },
            select: { id: true, barcode: true, stockCode: true, externalId: true },
          })
        : [];
      const byBarcode = new Map(existingProducts.filter((e) => e.barcode).map((e) => [e.barcode!, e.id]));
      const byStockCode = new Map(existingProducts.filter((e) => e.stockCode).map((e) => [e.stockCode!, e.id]));
      const byExternalId = new Map(existingProducts.filter((e) => e.externalId).map((e) => [e.externalId!, e.id]));
      const creates: any[] = [];
      const updates: { id: string; data: any }[] = [];

      for (const p of parsed) {
        const extId = p.externalId || p.barcode || p.stockCode || `CSV_${Math.random().toString(36).substring(2, 10)}`;
        const existingId =
          (p.barcode && byBarcode.get(p.barcode)) ||
          (p.stockCode && byStockCode.get(p.stockCode)) ||
          (p.externalId && byExternalId.get(p.externalId)) ||
          undefined;
        const data = {
          name: p.name || "",
          description: p.description || null,
          brand: fixedValues.brand || p.brand || null,
          category: fixedValues.category || p.category || null,
          barcode: p.barcode || null,
          stockCode: p.stockCode || null,
          externalId: extId,
          price: p.price || 0,
          discountedPrice: p.discountedPrice ?? p.salePrice ?? null,
          costPrice: p.costPrice || null,
          stock: p.stock || 0,
          currency: fixedValues.currency || "TRY",
          image: p.image || null,
          images: p.images || null,
          weight: p.weight || null,
          dimensions: p.dimensions || null,
          vatRate: p.vatRate || null,
          deliveryTime: p.deliveryTime || null,
          manufacturer: p.manufacturer || null,
          warranty: p.warranty || null,
          shippingCost: p.shippingCost || null,
          productUrl: p.productUrl || null,
          variantData: null,
          metadataJson: p.metadataJson || "{}",
          status: fixedValues.status || "active",
          sourceId: source.id,
        };
        if (existingId) updates.push({ id: existingId, data });
        else creates.push(data);
      }

      const BATCH = 500;
      for (let i = 0; i < creates.length; i += BATCH) {
        await prisma.thyronixProduct.createMany({ data: creates.slice(i, i + BATCH) as any });
      }
      for (let i = 0; i < updates.length; i += BATCH) {
        const batch = updates.slice(i, i + BATCH);
        await Promise.all(batch.map((u) => prisma.thyronixProduct.update({ where: { id: u.id }, data: u.data as any })));
      }

      const total = creates.length + updates.length;
      if (shouldSnapshot) await postSnapshot(source.id, source.name, total);
      await prisma.thyronixSource.update({
        where: { id: source.id },
        data: { productCount: total, lastSync: new Date(), status: "active", errorLog: null } as any,
      });
      if (shouldRefreshFeedTotals) await refreshDealerFeedTotals(source.dealerId || null);
      await prisma.thyronixSyncLog.create({
        data: {
          type: "source-sync",
          referenceId: source.name,
          status: "success",
          message: `CSV otomatik/manuel sync: ${creates.length} yeni, ${updates.length} güncelleme`,
          productCount: total,
          duration: Date.now() - startTime,
        },
      });

      return { sourceId: source.id, sourceName: source.name, type: sourceType, total, created: creates.length, updated: updates.length, duration: Date.now() - startTime };
    }

    throw new Error(`Desteklenmeyen kaynak tipi: ${sourceType}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kaynak sync hatası";
    await prisma.thyronixSource.update({ where: { id: source.id }, data: { errorLog: message, status: "error" } as any }).catch(() => null);
    await prisma.thyronixSyncLog.create({
      data: {
        type: "source-sync",
        referenceId: source.name,
        status: "error",
        message,
        duration: Date.now() - startTime,
      },
    }).catch(() => null);
    throw error;
  }
}

export async function syncDueThyronixSources(opts?: { now?: Date; limit?: number } & ThyronixSourceSyncOptions) {
  const now = opts?.now || new Date();
  const limit = Math.max(1, Math.min(opts?.limit || 10, 25));
  const sources = await prisma.thyronixSource.findMany({
    where: { status: { in: ["active", "error"] }, type: { in: ["xml", "excel", "csv"] } },
    orderBy: [{ lastSync: "asc" }, { createdAt: "asc" }],
  });
  const due = sources.filter((source) => isThyronixSourceDue(source, now)).slice(0, limit);
  const results: Array<ThyronixSourceSyncResult & { error?: string }> = [];

  for (const source of due) {
    try {
      results.push(await syncThyronixSourceById(source.id, opts));
    } catch (error) {
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        type: source.type,
        total: 0,
        created: 0,
        updated: 0,
        duration: 0,
        error: error instanceof Error ? error.message : "Kaynak sync hatası",
      });
    }
  }

  return {
    checked: sources.length,
    due: due.length,
    limit,
    results,
  };
}
