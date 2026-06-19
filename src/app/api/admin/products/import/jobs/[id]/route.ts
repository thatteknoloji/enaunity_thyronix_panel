import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const job = await prisma.productImportJob.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ success: false, error: "Job bulunamadı" }, { status: 404 });
    }

    let report: Record<string, unknown> = {};
    try { report = JSON.parse(job.reportJson || "{}"); } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      data: {
        ...job,
        progress: report.progress ?? null,
        total: report.total ?? job.productCount,
        productIds: report.productIds ?? [],
        errors: report.errors ?? [],
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
