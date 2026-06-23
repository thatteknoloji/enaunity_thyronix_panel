import { NextResponse } from "next/server";
import { previewProductImport } from "@/lib/product-universe/import-service";
import { requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

export async function handleProductUniverseImportPreview(req: Request) {
  const guard = await requireProductUniverseApiAccess();
  if (guard.error) return guard.error;

  const form = await req.formData();
  const file = form.get("file");
  const mappingRaw = form.get("mapping");

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "Dosya gerekli" }, { status: 400 });
  }

  let mapping: Record<string, string> | undefined;
  if (mappingRaw) {
    try {
      mapping = JSON.parse(String(mappingRaw));
    } catch {
      return NextResponse.json({ success: false, error: "mapping JSON geçersiz" }, { status: 400 });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const data = await previewProductImport(buffer, file.name, {
    dealerId: guard.dealerId,
    isAdmin: guard.isAdmin,
    mapping,
  });

  return NextResponse.json({ success: true, data });
}
