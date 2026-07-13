import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { previewPackageSourceImport } from "@/lib/product-library/package-import";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const form = await req.formData();
    const sourceType = String(form.get("sourceType") || "").toUpperCase();
    const xmlUrl = String(form.get("xmlUrl") || "").trim();
    const file = form.get("file") as File | null;
    const mappingRaw = String(form.get("mapping") || "{}");
    let mapping = {};
    try {
      mapping = JSON.parse(mappingRaw);
    } catch {}

    if (sourceType === "XML" && xmlUrl) {
      const data = await previewPackageSourceImport({ sourceType: "XML", xmlUrl });
      return NextResponse.json({ success: true, data });
    }

    if (!file) {
      return NextResponse.json({ success: false, error: "Dosya zorunlu" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = sourceType || (file.name.toLowerCase().endsWith(".xml") ? "XML" : file.name.toLowerCase().endsWith(".csv") ? "CSV" : "EXCEL");
    const data =
      detected === "XML"
        ? await previewPackageSourceImport({ sourceType: "XML", fileName: file.name, buffer })
        : await previewPackageSourceImport({ sourceType: detected as "EXCEL" | "CSV", fileName: file.name, buffer, mapping });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Önizleme alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
