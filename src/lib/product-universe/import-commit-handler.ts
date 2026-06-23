import { NextResponse } from "next/server";
import { commitProductImport, IMPORT_SOURCE_TYPES } from "@/lib/product-universe/import-service";
import { parseImportCommitForm, validateImportCommitForm } from "@/lib/product-universe/import-api-parse";

export async function handleProductUniverseImportCommit(
  req: Request,
  guard: { dealerId?: string | null; isAdmin: boolean }
) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "Dosya gerekli" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseImportCommitForm(form);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Form verisi geçersiz";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }

  if (!IMPORT_SOURCE_TYPES.includes(parsed.sourceType as (typeof IMPORT_SOURCE_TYPES)[number])) {
    return NextResponse.json(
      { success: false, error: `Geçersiz kaynak tipi. Desteklenen: ${IMPORT_SOURCE_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const validationError = validateImportCommitForm(parsed);
  if (validationError) {
    return NextResponse.json({ success: false, error: validationError }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await commitProductImport(buffer, file.name, {
    dealerId: guard.dealerId,
    isAdmin: guard.isAdmin,
    projectId: parsed.projectId,
    sourceType: parsed.sourceType,
    fileName: file.name,
    dryRun: parsed.dryRun,
    downloadImages: parsed.downloadImages,
    mapping: parsed.mapping,
    duplicateMode: parsed.duplicateMode,
    runAnalysis: parsed.runAnalysis,
    generateBlueprintPreview: parsed.generateBlueprintPreview,
    limit: parsed.limit,
    minQuality: parsed.minQuality,
    autoGenerateUniverse: parsed.autoGenerateUniverse,
    autoRunPipeline: parsed.autoRunPipeline,
    autoPublishInternal: parsed.autoPublishInternal,
    pipelineLimit: parsed.pipelineLimit,
    minPublishScore: parsed.minPublishScore,
    includeGeo: parsed.includeGeo,
    stopOnError: parsed.stopOnError,
  });

  return NextResponse.json({ success: true, data: result });
}
