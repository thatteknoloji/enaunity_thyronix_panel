import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runExcelImport, previewExcelColumns } from "@/lib/product-library/import-excel";

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const catalogId = String(form.get("catalogId") || "");
    const supplierId = String(form.get("supplierId") || "") || null;
    const previewOnly = form.get("previewOnly") === "true";
    const mappingRaw = String(form.get("mapping") || "{}");

    if (!file) {
      return NextResponse.json({ success: false, error: "Dosya zorunlu" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || "import.xlsx";

    if (previewOnly) {
      const preview = previewExcelColumns(buffer, fileName);
      return NextResponse.json({ success: true, data: preview });
    }

    if (!catalogId) {
      return NextResponse.json({ success: false, error: "Katalog seçimi zorunlu" }, { status: 400 });
    }

    let mapping = {};
    try {
      mapping = JSON.parse(mappingRaw);
    } catch {}

    const result = await runExcelImport({
      catalogId,
      supplierId,
      fileName,
      buffer,
      mapping,
      createdBy: user.email,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
