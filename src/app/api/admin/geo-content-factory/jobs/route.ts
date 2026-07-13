import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { enqueueJob } from "@/lib/job-center/enqueue";
import { previewGeoGeneration } from "@/lib/geo-content-factory/geo-content-factory-service";
import type { GeoGenerationMode } from "@/lib/geo-content-factory/types";
import { listGeoJobs } from "@/lib/geo-content-factory/geo-content-factory-service";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const jobs = await listGeoJobs({
      status: status as "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | undefined,
      limit: 100,
    });
    return NextResponse.json({ success: true, data: { jobs } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const action = body.action || "start";

    if (action === "preview") {
      const preview = previewGeoGeneration({
        keyword: body.keyword,
        mode: body.mode as GeoGenerationMode,
        settings: { provinces: body.provinces },
      });
      return NextResponse.json({ success: true, data: preview });
    }

    if (body.dryRun) {
      return NextResponse.json(
        { success: false, error: "dryRun için preview action kullanın" },
        { status: 400 }
      );
    }

    const preview = previewGeoGeneration({
      keyword: body.keyword,
      mode: body.mode as GeoGenerationMode,
      settings: { provinces: body.provinces },
    });

    const job = await enqueueJob({
      jobType: "GEO_GENERATION",
      entityType: "GEO",
      entityId: body.keyword || "",
      priority: body.priority || "NORMAL",
      totalSteps: preview.totalTargets,
      createdBy: user.id || user.email || "admin",
      metadata: {
        keyword: body.keyword,
        keywordGroup: body.keywordGroup,
        category: body.category,
        mode: body.mode,
        autoPublish: !!body.autoPublish,
        provinces: body.provinces,
      },
    });

    return NextResponse.json(
      { success: true, jobId: job.id, status: job.status, data: { jobId: job.id, status: job.status } },
      { status: 202 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
