import { NextResponse } from "next/server";
import { parseExcel, mapExcelToProducts, type ExcelProductRow, type ExcelValidationSummary } from "@/lib/thyronix/excel-parser";
import { requireThyronixDealerOrAdmin } from "@/lib/thyronix/access";
import { buildVariantMappingReadiness, inferVariantFieldsFromColumns } from "@/lib/thyronix/mapping-validation";
import { buildSuggestedProductMapping, buildSuggestedVariantMapping } from "@/lib/thyronix/field-aliases";

function parseJsonRecord(value: unknown): Record<string, string> {
  if (!value) return {};
  if (typeof value === "object" && !(value instanceof File)) return value as Record<string, string>;
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

function buildValidationSummary(products: ExcelProductRow[]): ExcelValidationSummary {
  let validRows = 0;
  let invalidRows = 0;
  let missingName = 0;
  let missingPrice = 0;
  let missingIdentity = 0;
  const invalidSamples: ExcelValidationSummary["invalidSamples"] = [];

  for (const product of products) {
    if (product.valid) {
      validRows++;
      continue;
    }

    invalidRows++;
    const hasName = product.productName?.trim().length > 0;
    const hasPrice = typeof product.price === "number" && product.price > 0;
    const hasIdentity = Boolean(product.barcode || product.stockCode || product.modelCode || product.externalId);

    if (!hasName) missingName++;
    if (!hasPrice) missingPrice++;
    if (!hasIdentity) missingIdentity++;

    if (invalidSamples.length < 10) {
      invalidSamples.push({
        row: product.rowIndex,
        name: product.productName || "—",
        errors: product.errors.length > 0 ? product.errors : [
          !hasName ? "Ürün adı eksik" : "",
          !hasPrice ? "Geçersiz fiyat" : "",
          !hasIdentity ? "Kimlik alanı eksik" : "",
        ].filter(Boolean) as string[],
      });
    }
  }

  return { validRows, invalidRows, missingProductName: missingName, missingPrice, missingIdentity, invalidSamples };
}

export async function POST(req: Request) {
  try {
    await requireThyronixDealerOrAdmin();
    let buffer: Buffer;
    let sheetName: string | undefined;
    let headerRow = 1;
    let fieldMapping: Record<string, string> = {};
    let variantMapping: Record<string, string> = {};
    let fixedValues: Record<string, string> = {};

    const ct = req.headers.get("content-type") || "";

    if (ct.includes("multipart")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const url = formData.get("url") as string | null;
      sheetName = (formData.get("sheetName") as string) || undefined;
      headerRow = parseInt((formData.get("headerRow") as string) || "1");
      fieldMapping = parseJsonRecord(formData.get("fieldMapping"));
      variantMapping = parseJsonRecord(formData.get("variantMapping"));
      fixedValues = parseJsonRecord(formData.get("fixedValues"));

      if (file) {
        buffer = Buffer.from(await file.arrayBuffer());
      } else if (url) {
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) return NextResponse.json({ error: `Dosya indirilemedi: HTTP ${res.status}` }, { status: 400 });
        buffer = Buffer.from(await res.arrayBuffer());
      } else {
        return NextResponse.json({ error: "Dosya veya URL gerekli" }, { status: 400 });
      }
    } else {
      const body = await req.json();
      const { url, sheetName: sn, headerRow: hr, fieldMapping: fm, variantMapping: vm, fixedValues: fv } = body;
      if (!url) return NextResponse.json({ error: "URL gerekli" }, { status: 400 });
      sheetName = sn || undefined;
      headerRow = hr || 1;
      fieldMapping = parseJsonRecord(fm);
      variantMapping = parseJsonRecord(vm);
      fixedValues = parseJsonRecord(fv);

      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) return NextResponse.json({ error: `Dosya indirilemedi: HTTP ${res.status}` }, { status: 400 });
      buffer = Buffer.from(await res.arrayBuffer());
    }

    const result = parseExcel(buffer, sheetName, headerRow);
    const variantFields = inferVariantFieldsFromColumns(result.columns);
    const suggestedMapping = buildSuggestedProductMapping(result.columns);
    const suggestedVariantMapping = buildSuggestedVariantMapping(result.columns);
    const effectiveFieldMapping = { ...suggestedMapping, ...fieldMapping };
    const effectiveVariantMapping = { ...suggestedVariantMapping, ...variantMapping };
    const mappedRows: ExcelProductRow[] = Object.keys(effectiveFieldMapping).length > 0
      ? mapExcelToProducts(result.allRows, effectiveFieldMapping, fixedValues, effectiveVariantMapping)
      : result.allRows.map((row, idx) => {
          const hasName = result.columns.some(c => String(row[c] || "").trim().length > 1);
          const hasPrice = result.columns.some(c => {
            const v = String(row[c] || "").replace(/[^0-9.,-]/g, "").replace(",", ".");
            return !isNaN(Number(v)) && Number(v) > 0;
          });
          const hasIdentity = result.columns.some(c => String(row[c] || "").trim().length >= 5);
          return {
            rowIndex: idx + 1,
            productName: String(result.columns.map(c => row[c]).find(v => v) || ""),
            price: hasPrice ? 1 : 0,
            stock: 0,
            raw: row,
            errors: [!hasName && "Ürün adı eksik", !hasPrice && "Geçersiz fiyat", !hasIdentity && "Kimlik alanı eksik"].filter(Boolean) as string[],
            valid: hasName && hasPrice && hasIdentity,
          };
        }) as ExcelProductRow[];

    const validation = buildValidationSummary(mappedRows);
    const variantReadiness = buildVariantMappingReadiness(variantFields, effectiveVariantMapping);

    return NextResponse.json({
      success: true,
      data: {
        sheets: result.sheets,
        selectedSheet: result.selectedSheet,
        headerRow: result.headerRow,
        columns: result.columns,
        previewRows: result.previewRows,
        variantFields,
        variantSampleValues: Object.fromEntries(
          variantFields.map((field) => [field, String(result.previewRows[0]?.[field] ?? "").slice(0, 80)]),
        ),
        totalRows: validation.validRows + validation.invalidRows,
        errors: result.errors,
        validation,
        variantReadiness,
        suggestedMapping,
        suggestedVariantMapping,
        mappingAware: Object.keys(fieldMapping).length > 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Excel işlenemedi" }, { status: 500 });
  }
}
