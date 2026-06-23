import { NextResponse } from "next/server";
import { commitProductImport, IMPORT_SOURCE_TYPES } from "@/lib/product-universe/import-service";
import { requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

/**
 * @deprecated Legacy monolithic import — yeni akış: excel/preview + excel/commit
 * Bu endpoint geri uyumluluk için tutulur; UI ProductUniverseImportWizard excel/* kullanır.
 */
export async function POST(req: Request) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const form = await req.formData();
    const file = form.get("file");
    const type = String(form.get("type") || "CSV");
    const projectId = form.get("projectId") ? String(form.get("projectId")) : undefined;
    const dryRun = String(form.get("dryRun") || "false") === "true";
    const downloadImages = String(form.get("downloadImages") || "false") === "true";
    const mappingRaw = form.get("mapping");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Dosya gerekli" }, { status: 400 });
    }

    if (!IMPORT_SOURCE_TYPES.includes(type as (typeof IMPORT_SOURCE_TYPES)[number])) {
      return NextResponse.json(
        { success: false, error: `Geçersiz kaynak tipi. Desteklenen: ${IMPORT_SOURCE_TYPES.join(", ")}` },
        { status: 400 }
      );
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
    const result = await commitProductImport(buffer, file.name, {
      dealerId: guard.dealerId,
      isAdmin: guard.isAdmin,
      projectId,
      sourceType: type,
      fileName: file.name,
      dryRun,
      downloadImages,
      mapping,
      duplicateMode: dryRun ? "skip" : "update",
      runAnalysis: !dryRun,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
