import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getImportJob } from "@/lib/data-universe/import-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const job = await getImportJob(id);
    if (!job) {
      return NextResponse.json({ success: false, error: "Job bulunamadı" }, { status: 404 });
    }
    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(job.metadataJson || "{}");
    } catch {
      metadata = {};
    }
    return NextResponse.json({ success: true, data: { ...job, metadata } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Job yüklenemedi";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
