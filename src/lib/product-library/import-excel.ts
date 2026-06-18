import { prisma } from "@/lib/db";
import { parseSpreadsheetBuffer, mapRowsToItems, detectColumns } from "./excel";
import { syncCatalogItems, saveImportJobReport } from "./import-sync";
import type { FieldMapping } from "./excel";

export async function runExcelImport(params: {
  catalogId: string;
  supplierId?: string | null;
  fileName: string;
  buffer: Buffer;
  mapping?: FieldMapping;
  createdBy: string;
}) {
  const started = Date.now();
  const type = params.fileName.toLowerCase().endsWith(".csv") ? "CSV" : "EXCEL";
  const job = await prisma.productImportJob.create({
    data: {
      type,
      status: "RUNNING",
      fileName: params.fileName,
      catalogId: params.catalogId,
      supplierId: params.supplierId || null,
      mappingJson: JSON.stringify(params.mapping || {}),
      createdBy: params.createdBy,
      startedAt: new Date(),
    },
  });

  try {
    const rows = parseSpreadsheetBuffer(params.buffer, params.fileName);
    if (rows.length === 0) throw new Error("Dosyada satır bulunamadı");
    const items = mapRowsToItems(rows, params.mapping);
    if (items.length === 0) throw new Error("Eşleme sonrası ürün bulunamadı");

    const report = await syncCatalogItems({
      catalogId: params.catalogId,
      supplierId: params.supplierId || null,
      items,
      sourceType: type,
    });
    const durationMs = Date.now() - started;
    await saveImportJobReport(job.id, report, items.length, durationMs);
    return {
      jobId: job.id,
      productCount: items.length,
      durationMs,
      addedCount: report.addedCount,
      updatedCount: report.updatedCount,
      removedCount: report.removedCount,
      unchangedCount: report.unchangedCount,
      sourceType: type,
      columns: detectColumns(rows),
      report,
    };
  } catch (e) {
    const durationMs = Date.now() - started;
    const msg = e instanceof Error ? e.message : "Import hatası";
    await prisma.productImportJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: msg, durationMs, completedAt: new Date() },
    });
    throw e;
  }
}

export function previewExcelColumns(buffer: Buffer, fileName: string) {
  const rows = parseSpreadsheetBuffer(buffer, fileName);
  return { columns: detectColumns(rows), rowCount: rows.length, sample: rows.slice(0, 3) };
}
