import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listImportJobs } from "@/lib/data-universe/import-service";

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
