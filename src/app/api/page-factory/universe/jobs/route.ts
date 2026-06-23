import { NextResponse } from "next/server";
import { getUniverseDashboardStats, getUniverseJobs } from "@/lib/page-factory/universe/universe-generator-service";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";

export async function GET(req: Request) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") || undefined;
    const page = url.searchParams.get("page") ? Number(url.searchParams.get("page")) : 1;
    const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 20;

    const [jobs, stats] = await Promise.all([
      getUniverseJobs({ dealerId: user.dealerId, projectId, page, limit }),
      getUniverseDashboardStats(projectId),
    ]);

    return NextResponse.json({ success: true, data: { ...jobs, stats } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Universe jobs yüklenemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
