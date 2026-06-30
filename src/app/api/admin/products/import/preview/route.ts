import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { detectPreset, getPresetMapping, mergeMapping } from "@/lib/products/marketplace-import/presets";
import { parseRowsFromBuffer, parseCsvText } from "@/lib/products/marketplace-import/parser";
import { groupByModelCode, extractCategoryValues } from "@/lib/products/marketplace-import/grouper";
import { savePreview } from "@/lib/products/marketplace-import/preview-store";
import type { FieldMapping, ImportPresetId } from "@/lib/products/marketplace-import/types";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const presetParam = (formData.get("preset") as string) || "auto";
    const mappingJson = formData.get("mapping") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Dosya gerekli" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase();

    let overrides: Partial<FieldMapping> = {};
    if (mappingJson) {
      try { overrides = JSON.parse(mappingJson); } catch { /* ignore */ }
    }

    let rows;
    let columns: string[] = [];
    let parseErrors: string[] = [];
    let preset: ImportPresetId;
    let mapping: FieldMapping;

    if (ext === "csv") {
      const text = buffer.toString("utf-8");
      preset = (presetParam === "auto" ? "generic" : presetParam) as ImportPresetId;
      mapping = mergeMapping(preset, overrides);
      rows = parseCsvText(text, mapping);
      columns = Object.keys((rows[0]?.raw || {}) as Record<string, unknown>);
    } else if (ext === "xml") {
      const { parseXmlImportRows } = await import("@/lib/products/marketplace-import/xml-parser");
      preset = (presetParam === "auto" ? "trendyol_tablo" : presetParam) as ImportPresetId;
      mapping = mergeMapping(preset, overrides);
      rows = parseXmlImportRows(buffer.toString("utf-8"), mapping);
      columns = Object.keys((rows[0]?.raw || {}) as Record<string, unknown>);
    } else {
      const probe = parseRowsFromBuffer(buffer, getPresetMapping("generic"), fileName);
      columns = probe.columns;
      parseErrors = probe.errors;
      preset = presetParam === "auto" ? detectPreset(columns) : (presetParam as ImportPresetId);
      mapping = mergeMapping(preset, overrides);
      const result = parseRowsFromBuffer(buffer, mapping, fileName);
      rows = result.rows;
      parseErrors = result.errors;
    }

    const { groups, ungroupedRows } = groupByModelCode(rows);
    const categoryValues = extractCategoryValues(groups);

    const previewJob = await prisma.productImportJob.create({
      data: {
        type: preset,
        status: "PREVIEW",
        fileName,
        productCount: groups.length,
        reportJson: JSON.stringify({ totalRows: rows.length, ungroupedCount: ungroupedRows.length }),
      },
    });

    await savePreview({
      jobId: previewJob.id,
      fileName,
      preset,
      groups,
      totalRows: rows.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        previewJobId: previewJob.id,
        preset,
        fileName,
        totalRows: rows.length,
        groupCount: groups.length,
        ungroupedCount: ungroupedRows.length,
        groups: groups.slice(0, 50).map((g) => ({
          modelCode: g.modelCode,
          name: g.name,
          description: g.description.slice(0, 200),
          brand: g.brand,
          category: g.category,
          variantCount: g.rows.length,
          price: g.price,
          stock: g.stock,
          errors: g.errors.slice(0, 5),
          warnings: g.warnings.slice(0, 5),
          sampleVariants: g.rows.slice(0, 3).map((r) => ({
            sku: r.sku,
            barcode: r.barcode,
            price: r.price,
            stock: r.stock,
            options: r.variantOptions,
          })),
        })),
        categoryValues,
        parseErrors,
        columns,
        mapping,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Önizleme hatası" },
      { status: 500 },
    );
  }
}
