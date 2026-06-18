import { prisma } from "@/lib/db";
import { parseXmlProducts } from "./xml";
import { syncCatalogItems, saveImportJobReport } from "./import-sync";

export async function runXmlImport(params: {
  catalogId: string;
  supplierId?: string | null;
  sourceUrl?: string;
  xmlContent?: string;
  createdBy: string;
}) {
  const started = Date.now();
  const job = await prisma.productImportJob.create({
    data: {
      type: "XML",
      status: "RUNNING",
      sourceUrl: params.sourceUrl || "",
      catalogId: params.catalogId,
      supplierId: params.supplierId || null,
      createdBy: params.createdBy,
      startedAt: new Date(),
    },
  });

  try {
    let xml = params.xmlContent || "";
    if (!xml && params.sourceUrl) {
      const res = await fetch(params.sourceUrl, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`XML fetch failed: HTTP ${res.status}`);
      xml = await res.text();
    }
    if (!xml.trim()) throw new Error("XML içeriği boş");

    const items = parseXmlProducts(xml);
    if (items.length === 0) throw new Error("XML içinde ürün bulunamadı");

    const report = await syncCatalogItems({
      catalogId: params.catalogId,
      supplierId: params.supplierId || null,
      items,
      sourceType: "XML",
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
      sourceType: "XML",
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

export async function testXmlUrl(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const items = parseXmlProducts(xml);
  return { productCount: items.length, sample: items.slice(0, 3) };
}
