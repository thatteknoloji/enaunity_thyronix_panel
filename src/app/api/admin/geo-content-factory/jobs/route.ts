import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  listGeoJobs,
  previewGeoGeneration,
  startGeoJob,
} from "@/lib/geo-content-factory/geo-content-factory-service";
import type { GeoGenerationMode } from "@/lib/geo-content-factory/types";

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
    await requireAdmin();
    const body = await req.json();
    const action = body.action || "start";

    if (action === "preview") {
      const preview = previewGeoGeneration({
        keyword: body.keyword,
        mode: body.mode as GeoGenerationMode,
        settings: {
          provinces: body.provinces,
        },
      });
      return NextResponse.json({ success: true, data: preview });
    }

    const { job, result } = await startGeoJob({
      keyword: body.keyword,
      keywordGroup: body.keywordGroup,
      category: body.category,
      mode: body.mode as GeoGenerationMode,
      autoPublish: !!body.autoPublish,
      dryRun: !!body.dryRun,
      provinces: body.provinces,
    });

    return NextResponse.json({ success: true, data: { job, result } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
