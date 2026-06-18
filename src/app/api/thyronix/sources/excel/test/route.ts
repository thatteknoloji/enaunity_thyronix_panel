import { NextResponse } from "next/server";
import { parseExcel, mapExcelToProducts } from "@/lib/thyronix/excel-parser";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";

function getRequestBody(req: Request): Promise<any> {
  const ct = req.headers.get("content-type") || "";
  return ct.includes("multipart") ? req.formData() : req.json();
}

export async function POST(req: Request) {
  try {
    await requireThyronixDealerOrAdmin();
    let buffer: Buffer;
    let sheetName: string | undefined;
    let headerRow = 1;

    const ct = req.headers.get("content-type") || "";

    if (ct.includes("multipart")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const url = formData.get("url") as string | null;
      sheetName = (formData.get("sheetName") as string) || undefined;
      headerRow = parseInt((formData.get("headerRow") as string) || "1");

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
      const { url, sheetName: sn, headerRow: hr } = body;
      if (!url) return NextResponse.json({ error: "URL gerekli" }, { status: 400 });
      sheetName = sn || undefined;
      headerRow = hr || 1;

      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) return NextResponse.json({ error: `Dosya indirilemedi: HTTP ${res.status}` }, { status: 400 });
      buffer = Buffer.from(await res.arrayBuffer());
    }

    const result = parseExcel(buffer, sheetName, headerRow);

    // Run validation on all rows
    let validRows = 0, invalidRows = 0, missingName = 0, missingPrice = 0, missingIdentity = 0;
    const invalidSamples: any[] = [];

    // Quick validation: check each row has non-empty columns
    for (let i = 0; i < result.allRows.length; i++) {
      const row = result.allRows[i];
      const vals = Object.values(row).filter(v => v !== "" && v !== null && v !== undefined);
      if (vals.length === 0) { invalidRows++; continue; }

      const hasName = result.columns.some(c => String(row[c] || "").trim().length > 1);
      const hasPrice = result.columns.some(c => {
        const v = String(row[c] || "").replace(/[^0-9.,-]/g, "").replace(",", ".");
        return !isNaN(Number(v)) && Number(v) > 0;
      });
      const hasIdentity = result.columns.some(c => String(row[c] || "").trim().length >= 5);

      if (hasName && hasPrice && hasIdentity) validRows++;
      else {
        invalidRows++;
        if (!hasName) missingName++;
        if (!hasPrice) missingPrice++;
        if (!hasIdentity) missingIdentity++;
        if (invalidSamples.length < 10) invalidSamples.push({ row: i + 1, name: String(result.columns.map(c => row[c]).find(v => v) || "—"), errors: [!hasName && "Ürün adı eksik", !hasPrice && "Geçersiz fiyat", !hasIdentity && "Kimlik alanı eksik"].filter(Boolean) });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sheets: result.sheets,
        selectedSheet: result.selectedSheet,
        headerRow: result.headerRow,
        columns: result.columns,
        previewRows: result.previewRows,
        totalRows: validRows + invalidRows,
        errors: result.errors,
        validation: { validRows, invalidRows, missingProductName: missingName, missingPrice: missingPrice, missingIdentity: missingIdentity, invalidSamples },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Excel işlenemedi" }, { status: 500 });
  }
}
