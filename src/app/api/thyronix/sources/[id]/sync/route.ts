import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCanAccessSource, requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import { getTemplate } from "@/lib/thyronix/templates";
import { parseXmlToProducts } from "@/lib/thyronix/xml-parser";
import { parseExcel, mapExcelToProducts, getIdentityKey } from "@/lib/thyronix/excel-parser";
import { parseCsvToProducts } from "@/lib/thyronix/csv-parser";

async function preSnapshot(sourceId: string, sourceName: string) {
  try {
    const count = await prisma.thyronixProduct.count({ where: { sourceId } });
    if (count > 0) {
      const products = await prisma.thyronixProduct.findMany({ where: { sourceId }, take: 50000, select: { id: true, name: true, price: true, stock: true, brand: true, category: true, status: true, barcode: true } });
      await prisma.thyronixSnapshot.create({ data: { label: `Pre-sync - ${sourceName}`, type: "sync", sourceId, productCount: count, activeCount: count, passiveCount: 0, errorCount: 0, warningCount: 0, snapshotData: JSON.stringify(products) } });
    }
  } catch {}
}

async function postSnapshot(sourceId: string, sourceName: string, total: number) {
  try {
    await prisma.thyronixSnapshot.create({ data: { label: `Post-sync - ${sourceName}`, type: "sync", sourceId, productCount: total, activeCount: total, passiveCount: 0, errorCount: 0, warningCount: 0, snapshotData: "{}" } });
  } catch {}
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { id } = await params;
    await assertCanAccessSource(user, id);
    const source = await prisma.thyronixSource.findUnique({ where: { id } });
    if (!source) return NextResponse.json({ success: false, error: "Kaynak bulunamadı" }, { status: 404 });

    const startTime = Date.now();
    const sourceType = (source as any).type || "xml";
    const url = (source as any).xmlUrl || source.xmlUrl;
    let customFieldMap: Record<string, string> = {};
    let fixedValues: Record<string, string> = {};
    try { customFieldMap = JSON.parse((source as any).fieldMapping || "{}"); } catch {}
    try { fixedValues = JSON.parse((source as any).fixedValues || "{}"); } catch {}

    await preSnapshot(id, source.name);

    // ═══ XML ═══
    if (sourceType === "xml") {
      const res = await fetch(url, { headers: { "User-Agent": "THYRONIX Feed Engine/1.0", Accept: "text/xml,application/xml,*/*" }, signal: AbortSignal.timeout(90000) });
      if (!res.ok) { const em = `HTTP ${res.status}`; await prisma.thyronixSource.update({ where: { id }, data: { errorLog: em, status: "error" } as any }); return NextResponse.json({ success: false, error: em }, { status: 400 }); }
      const xmlText = await res.text();
      if (!xmlText || xmlText.length < 10) { await prisma.thyronixSource.update({ where: { id }, data: { errorLog: "Boş yanıt", status: "error" } as any }); return NextResponse.json({ success: false, error: "Boş yanıt" }, { status: 400 }); }

      const formatId = (source as any).inputFormat || "custom_xml";
      const template = getTemplate(formatId);
      if (!template) return NextResponse.json({ success: false, error: "Geçersiz format" }, { status: 400 });

      const products = parseXmlToProducts(xmlText, template, customFieldMap);
      const seen = new Set<string>();
      const allData: any[] = [];
      for (const p of products) {
        const extId = String(p.barcode || p.stockCode || p.name || Math.random().toString(36));
        if (seen.has(extId)) continue; seen.add(extId);
        allData.push({ sourceId: id, externalId: extId, name: p.name || "", description: p.description || null, brand: fixedValues.brand || p.brand || null, category: fixedValues.category || p.category || null, barcode: p.barcode || null, stockCode: p.stockCode || null, modelCode: p.modelCode || null, price: p.price || 0, stock: p.stock || 0, currency: fixedValues.currency || p.currency || "TRY", images: p.images || null, variantData: (p as any).variantData || null, status: fixedValues.status || p.status || "active" });
      }

      await prisma.thyronixProduct.deleteMany({ where: { sourceId: id } });
      const BATCH = 1000;
      for (let i = 0; i < allData.length; i += BATCH) {
        await prisma.thyronixProduct.createMany({ data: allData.slice(i, i + BATCH) });
      }

      await postSnapshot(id, source.name, allData.length);
      await prisma.thyronixSource.update({ where: { id }, data: { productCount: allData.length, lastSync: new Date(), status: "active" } as any });
      await prisma.thyronixSyncLog.create({ data: { type: "sync", referenceId: source.name, status: "success", message: `XML: ${allData.length} ürün` } });

      return NextResponse.json({ success: true, data: { total: allData.length, created: allData.length, duration: Date.now() - startTime } });
    }

    // ═══ Excel ═══
    if (sourceType === "excel") {
      const fileRes = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!fileRes.ok) { await prisma.thyronixSource.update({ where: { id }, data: { errorLog: `HTTP ${fileRes.status}`, status: "error" } as any }); return NextResponse.json({ success: false, error: `Dosya indirilemedi: HTTP ${fileRes.status}` }, { status: 400 }); }
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      const sheetName = fixedValues._sheetName || undefined;
      const headerRow = parseInt(fixedValues._headerRow || "1");

      const parsed = parseExcel(buffer, sheetName, headerRow);
      if (parsed.errors.length > 0) { await prisma.thyronixSource.update({ where: { id }, data: { errorLog: parsed.errors[0], status: "error" } as any }); return NextResponse.json({ success: false, error: parsed.errors[0] }, { status: 400 }); }

      const products = mapExcelToProducts(parsed.allRows, customFieldMap, fixedValues);
      const valid = products.filter(p => p.valid);

      // Batch: collect identity keys
      const barcodes = valid.filter(p => p.barcode).map(p => p.barcode!);
      const stockCodes = valid.filter(p => p.stockCode).map(p => p.stockCode!);
      const modelCodes = valid.filter(p => p.modelCode).map(p => p.modelCode!);

      // Bulk fetch existing products
      const existingProducts = await prisma.thyronixProduct.findMany({
        where: { sourceId: id, OR: [
          ...(barcodes.length > 0 ? [{ barcode: { in: barcodes } }] : []),
          ...(stockCodes.length > 0 ? [{ stockCode: { in: stockCodes } }] : []),
          ...(modelCodes.length > 0 ? [{ modelCode: { in: modelCodes } }] : []),
        ]},
        select: { id: true, barcode: true, stockCode: true, modelCode: true },
      });

      // Build lookup maps
      const byBarcode = new Map(existingProducts.filter(e => e.barcode).map(e => [e.barcode!, e.id]));
      const byStockCode = new Map(existingProducts.filter(e => e.stockCode).map(e => [e.stockCode!, e.id]));
      const byModelCode = new Map(existingProducts.filter(e => e.modelCode).map(e => [e.modelCode!, e.id]));

      const creates: any[] = [];
      const updates: { id: string; data: any }[] = [];

      for (const p of valid) {
        const existingId = p.barcode ? byBarcode.get(p.barcode) : p.stockCode ? byStockCode.get(p.stockCode) : p.modelCode ? byModelCode.get(p.modelCode) : undefined;
        const data = { name: p.productName, description: p.description || null, brand: p.brand || null, category: p.category || null, barcode: p.barcode || null, stockCode: p.stockCode || null, modelCode: p.modelCode || null, price: p.price, discountedPrice: p.salePrice || null, stock: p.stock, currency: p.currency || "TRY", images: p.images || null, status: p.status || "active", sourceId: id };

        if (existingId) {
          updates.push({ id: existingId, data });
        } else {
          creates.push({ ...data, externalId: `EXCEL_${p.rowIndex}` });
        }
      }

      // Batch create
      const BATCH = 500;
      for (let i = 0; i < creates.length; i += BATCH) {
        await prisma.thyronixProduct.createMany({ data: creates.slice(i, i + BATCH) as any });
      }
      // Batch update
      for (let i = 0; i < updates.length; i += BATCH) {
        const batch = updates.slice(i, i + BATCH);
        await Promise.all(batch.map(u => prisma.thyronixProduct.update({ where: { id: u.id }, data: u.data as any })));
      }

      const created = creates.length;
      const updated = updates.length;
      const total = created + updated;
      await postSnapshot(id, source.name, total);
      await prisma.thyronixSource.update({ where: { id }, data: { productCount: total, lastSync: new Date(), status: "active" } as any });
      await prisma.thyronixSyncLog.create({ data: { type: "sync", referenceId: source.name, status: "success", message: `Excel: ${created} yeni, ${updated} güncelleme (batch)` } });

      return NextResponse.json({ success: true, data: { total, created, updated, errors: products.filter(p=>!p.valid).length, duration: Date.now() - startTime } });
    }

    // ═══ CSV ═══
    if (sourceType === "csv") {
      const csvRes = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!csvRes.ok) { await prisma.thyronixSource.update({ where: { id }, data: { errorLog: `HTTP ${csvRes.status}`, status: "error" } as any }); return NextResponse.json({ success: false, error: `HTTP ${csvRes.status}` }, { status: 400 }); }
      const csvText = await csvRes.text();
      const parsed = parseCsvToProducts(csvText);

      const barcodes = parsed.filter(p => p.barcode).map(p => p.barcode!);
      const stockCodes = parsed.filter(p => p.stockCode).map(p => p.stockCode!);

      const existingProducts = await prisma.thyronixProduct.findMany({
        where: { sourceId: id, OR: [
          ...(barcodes.length > 0 ? [{ barcode: { in: barcodes } }] : []),
          ...(stockCodes.length > 0 ? [{ stockCode: { in: stockCodes } }] : []),
        ]},
        select: { id: true, barcode: true, stockCode: true },
      });

      const byBarcode = new Map(existingProducts.filter(e => e.barcode).map(e => [e.barcode!, e.id]));
      const byStockCode = new Map(existingProducts.filter(e => e.stockCode).map(e => [e.stockCode!, e.id]));

      const createsCsv: any[] = [];
      const updatesCsv: { id: string; data: any }[] = [];

      for (const p of parsed) {
        const extId = p.barcode || p.stockCode || `CSV_${Math.random().toString(36).substring(2, 10)}`;
        const existingId = p.barcode ? byBarcode.get(p.barcode) : p.stockCode ? byStockCode.get(p.stockCode) : undefined;
        const data: any = { name: p.name || "", description: p.description || null, brand: fixedValues.brand || p.brand || null, category: fixedValues.category || p.category || null, barcode: p.barcode || null, stockCode: p.stockCode || null, price: p.price || 0, stock: p.stock || 0, currency: fixedValues.currency || "TRY", status: fixedValues.status || "active", sourceId: id };
        if (existingId) { updatesCsv.push({ id: existingId, data }); }
        else { createsCsv.push({ ...data, externalId: extId }); }
      }

      const B = 500;
      for (let i = 0; i < createsCsv.length; i += B) { await prisma.thyronixProduct.createMany({ data: createsCsv.slice(i, i + B) as any }); }
      for (let i = 0; i < updatesCsv.length; i += B) { const batch = updatesCsv.slice(i, i + B); await Promise.all(batch.map(u => prisma.thyronixProduct.update({ where: { id: u.id }, data: u.data as any }))); }

      const createdCsv = createsCsv.length;
      const updatedCsv = updatesCsv.length;
      const totalCsv = createdCsv + updatedCsv;
      await postSnapshot(id, source.name, totalCsv);
      await prisma.thyronixSource.update({ where: { id }, data: { productCount: totalCsv, lastSync: new Date(), status: "active" } as any });
      await prisma.thyronixSyncLog.create({ data: { type: "sync", referenceId: source.name, status: "success", message: `CSV: ${createdCsv} yeni, ${updatedCsv} güncelleme (batch)` } });

      return NextResponse.json({ success: true, data: { total: totalCsv, created: createdCsv, updated: updatedCsv, duration: Date.now() - startTime } });
    }

    // ═══ API (Beta) ═══
    if (sourceType === "api") {
      return NextResponse.json({ success: false, error: "API kaynak desteği beta aşamasındadır. JSON path, auth ve sayfalama desteği bir sonraki sürümde aktif olacaktır." }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: `Desteklenmeyen kaynak tipi: ${sourceType}` }, { status: 400 });
  } catch (e: any) {
    return thyronixErrorResponse(e, e.message || "Sunucu hatası");
  }
}
