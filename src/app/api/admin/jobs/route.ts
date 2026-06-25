import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getJobDashboardStats, listJobs } from "@/lib/job-center/job-service";
import type { JobStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    if (searchParams.get("stats") === "1") {
      const stats = await getJobDashboardStats();
      return NextResponse.json({ success: true, data: stats });
    }

    const statusParam = searchParams.get("status");
    let status: JobStatus | JobStatus[] | undefined;
    if (statusParam) {
      status = statusParam.includes(",")
        ? (statusParam.split(",") as JobStatus[])
        : (statusParam as JobStatus);
    }

    const jobs = await listJobs({
      status,
      limit: Number(searchParams.get("limit") || 100),
    });

    return NextResponse.json({ success: true, data: jobs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Liste alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
