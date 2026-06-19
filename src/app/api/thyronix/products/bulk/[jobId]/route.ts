import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import { runThyronixBulkJob } from "@/lib/thyronix/bulk-job-worker";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    await requireThyronixDealerOrAdmin();
    const { jobId } = await params;
    const job = await prisma.thyronixBulkJob.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ success: false, error: "Job bulunamadı" }, { status: 404 });

    if (job.status === "pending" || job.status === "running") {
      await runThyronixBulkJob(jobId, 5);
    }

    const refreshed = await prisma.thyronixBulkJob.findUnique({ where: { id: jobId } });
    const remaining = Math.max(0, (refreshed?.totalCount || 0) - (refreshed?.processedCount || 0));
    const sampleIds = JSON.parse(refreshed?.productIdsJson || "[]").slice(
      refreshed?.processedCount || 0,
      (refreshed?.processedCount || 0) + 20,
    );

    return NextResponse.json({
      success: true,
      data: {
        ...refreshed,
        remaining,
        nextProductIds: sampleIds,
        progressPercent: refreshed?.totalCount
          ? Math.round(((refreshed.processedCount / refreshed.totalCount) * 100))
          : 0,
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
