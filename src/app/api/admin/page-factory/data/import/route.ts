import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  IMPORT_TYPES,
  listImportJobs,
  parseImportFile,
  runDataUniverseImport,
  type ImportType,
} from "@/lib/data-universe/import-service";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit = parseInt(searchParams.get("limit") || "20", 10) || 20;
    const data = await listImportJobs(page, limit);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import job listesi alınamadı";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const form = await req.formData();
    const file = form.get("file");
    const type = String(form.get("type") || "");
    const dryRun = String(form.get("dryRun") || "false") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Dosya gerekli" }, { status: 400 });
    }
    if (!IMPORT_TYPES.includes(type as ImportType)) {
      return NextResponse.json({ success: false, error: "Geçersiz veri tipi" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseImportFile(buffer, file.name);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Dosyada satır bulunamadı" }, { status: 400 });
    }

    const { jobId, result } = await runDataUniverseImport({
      type: type as ImportType,
      rows,
      dryRun,
      fileName: file.name,
      createdById: admin.id,
    });

    return NextResponse.json({
      success: true,
      data: { jobId, dryRun, ...result },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
