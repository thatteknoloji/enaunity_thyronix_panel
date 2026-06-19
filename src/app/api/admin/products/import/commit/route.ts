import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { loadPreview } from "@/lib/products/marketplace-import/preview-store";
import {
  queueImportJob,
  processImportJobChunk,
  shouldQueueImport,
  runPendingImportJobs,
} from "@/lib/products/marketplace-import/import-worker";
import { commitImport } from "@/lib/products/marketplace-import/upsert-engine";
import { deletePreview } from "@/lib/products/marketplace-import/preview-store";
import type { CategoryMapping, GroupedProduct } from "@/lib/products/marketplace-import/types";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { previewJobId, categoryMapping = {} } = body;

    if (!previewJobId) {
      return NextResponse.json({ success: false, error: "previewJobId gerekli" }, { status: 400 });
    }

    const stored = await loadPreview(previewJobId);
    if (!stored?.groups?.length) {
      return NextResponse.json({ success: false, error: "Önizleme bulunamadı" }, { status: 404 });
    }

    const groupCount = stored.groups.length;

    if (shouldQueueImport(groupCount)) {
      await queueImportJob(previewJobId, categoryMapping as CategoryMapping);
      // İlk chunk'ı hemen başlat (HTTP timeout önleme)
      await processImportJobChunk(previewJobId);
      return NextResponse.json({
        success: true,
        data: {
          jobId: previewJobId,
          queued: true,
          groupCount,
          message: "Büyük import kuyruğa alındı — arka planda işleniyor",
        },
      });
    }

    const result = await commitImport(
      stored.groups as GroupedProduct[],
      categoryMapping as CategoryMapping,
      { fileName: stored.fileName, preset: stored.preset, jobId: previewJobId },
    );
    await deletePreview(previewJobId);

    return NextResponse.json({ success: true, data: { ...result, queued: false } });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "İçe aktarma hatası" },
      { status: 500 },
    );
  }
}

/** Manuel tetikleme: bir sonraki chunk */
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ success: false, error: "jobId gerekli" }, { status: 400 });
    const r = await processImportJobChunk(jobId);
    return NextResponse.json({ success: true, data: r });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Hata" }, { status: 500 });
  }
}
