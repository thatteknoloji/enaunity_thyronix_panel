import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseExcel, mapExcelToProducts, getIdentityKey } from "@/lib/thyronix/excel-parser";
import { assertCanAccessSource, requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import {
  buildVariantMappingReadiness,
  getMissingRequiredMappings,
  inferVariantFieldsFromColumns,
  mappingErrorLabel,
} from "@/lib/thyronix/mapping-validation";

function parseJsonRecord(value: unknown): Record<string, string> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, string>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed as Record<string, string> : {};
    } catch {
      return {};
    }
  }
  return {};
}

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const { sourceId, fileUrl, sheetName, headerRow } = body;
    const fieldMapping = parseJsonRecord(body.fieldMapping);
    const fixedValues = parseJsonRecord(body.fixedValues);
    const variantMapping = parseJsonRecord(body.variantMapping);

    if (!sourceId) return NextResponse.json({ error: "sourceId gerekli" }, { status: 400 });
    await assertCanAccessSource(user, sourceId);
    const missing = getMissingRequiredMappings(fieldMapping);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Eksik eşleştirme: ${missing.map(mappingErrorLabel).join(", ")}` }, { status: 400 });
    }

    const source = await prisma.thyronixSource.findUnique({ where: { id: sourceId } });
    if (!source) return NextResponse.json({ error: "Kaynak bulunamadı" }, { status: 404 });

    let buffer: Buffer;
    if (fileUrl) {
      const res = await fetch(fileUrl, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) return NextResponse.json({ error: `Dosya indirilemedi: HTTP ${res.status}` }, { status: 400 });
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      return NextResponse.json({ error: "fileUrl gerekli" }, { status: 400 });
    }

    const hr = headerRow || 1;
    const parsed = parseExcel(buffer, sheetName || undefined, hr);
    if (parsed.errors.length > 0) return NextResponse.json({ error: parsed.errors.join("; ") }, { status: 400 });
    const variantReadiness = buildVariantMappingReadiness(inferVariantFieldsFromColumns(parsed.columns), variantMapping);
    if (variantReadiness.detected && !variantReadiness.ready) {
      return NextResponse.json({
        error: `Varyant eşleştirmesi eksik: ${variantReadiness.missing.map(mappingErrorLabel).join(", ")}`,
      }, { status: 400 });
    }

    const products = mapExcelToProducts(parsed.allRows, fieldMapping, fixedValues, variantMapping);

    const valid = products.filter(p => p.valid);
    const invalid = products.filter(p => !p.valid);

    // Take pre-sync snapshot
    const existingCount = await prisma.thyronixProduct.count({ where: { sourceId } });
    await prisma.thyronixSnapshot.create({
      data: { label: `Excel import öncesi - ${source.name}`, type: "sync", sourceId, productCount: existingCount, activeCount: existingCount, passiveCount: 0, errorCount: 0, warningCount: 0, snapshotData: "{}" },
    });

    let created = 0, updated = 0;

    for (const product of valid) {
      const identity = getIdentityKey(product);
      const identityField = identity.field === "barcode" ? "barcode" : identity.field === "stockCode" ? "stockCode" : identity.field === "modelCode" ? "modelCode" : "externalId";

      const existing = identityField === "externalId"
        ? await prisma.thyronixProduct.findFirst({ where: { sourceId, externalId: identity.value } })
        : await prisma.thyronixProduct.findFirst({ where: { sourceId, [identityField]: identity.value } });

      const data = {
        name: product.productName,
        description: product.description || null,
        brand: product.brand || null,
        category: product.category || null,
        barcode: product.barcode || null,
        stockCode: product.stockCode || null,
        modelCode: product.modelCode || null,
        externalId: product.externalId || identity.value,
        price: product.price,
        discountedPrice: product.discountedPrice ?? product.salePrice ?? null,
        costPrice: product.costPrice ?? null,
        stock: product.stock,
        currency: product.currency || "TRY",
        image: product.image || null,
        images: product.images || null,
        weight: product.weight ?? null,
        dimensions: product.dimensions || null,
        vatRate: product.vatRate ?? null,
        deliveryTime: product.deliveryTime || null,
        manufacturer: product.manufacturer || null,
        warranty: product.warranty || null,
        shippingCost: product.shippingCost ?? null,
        productUrl: product.productUrl || null,
        variantData: product.variantData || null,
        metadataJson: product.metadataJson || "{}",
        status: product.status || "active",
        sourceId,
      };

      if (existing) {
        await prisma.thyronixProduct.update({ where: { id: existing.id }, data: data as any });
        updated++;
      } else {
        await prisma.thyronixProduct.create({ data: data as any });
        created++;
      }
    }

    // Take post-sync snapshot
    const newCount = await prisma.thyronixProduct.count({ where: { sourceId } });
    await prisma.thyronixSnapshot.create({
      data: { label: `Excel import sonrası - ${source.name}`, type: "sync", sourceId, productCount: newCount, activeCount: newCount, passiveCount: 0, errorCount: invalid.length, warningCount: 0, snapshotData: "{}" },
    });

    // Update source
    await prisma.thyronixSource.update({ where: { id: sourceId }, data: { productCount: newCount, lastSync: new Date(), status: "active" } });

    // Sync log
    await prisma.thyronixSyncLog.create({
      data: { type: "sync", referenceId: source.name, status: "success", message: `Excel: ${created} oluşturuldu, ${updated} güncellendi, ${invalid.length} hatalı` },
    });

    return NextResponse.json({
      success: true,
      data: { total: parsed.totalRows, valid: valid.length, invalid: invalid.length, created, updated, invalidRows: invalid.slice(0, 20).map(p => ({ row: p.rowIndex, name: p.productName, errors: p.errors })) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Excel import hatası" }, { status: 500 });
  }
}
