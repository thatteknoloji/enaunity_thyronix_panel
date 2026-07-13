import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  runFullPipelineFromPlan,
  runFullPipelineFromKeyword,
  listQualityPending,
  listPipelinePublished,
} from "@/lib/content-operations/content-pipeline-service";
import { listQueue, enrichQueueItems } from "@/lib/publishing-center/publishing-service";
import { listContentPlans } from "@/lib/content-planning/content-planning-service";
import type { PlanEngine } from "@/lib/content-planning/types";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    if (view === "plans") {
      const plans = await listContentPlans(50);
      return NextResponse.json({ success: true, data: { plans } });
    }
    if (view === "quality-pending") {
      const items = await listQualityPending(100);
      return NextResponse.json({ success: true, data: { items } });
    }
    if (view === "published") {
      const items = await listPipelinePublished(100);
      return NextResponse.json({ success: true, data: { items } });
    }
    if (view === "queue") {
      const items = await enrichQueueItems(await listQueue({ limit: 100 }));
      return NextResponse.json({ success: true, data: { items } });
    }

    const items = await enrichQueueItems(await listQueue({ limit: 50 }));
    return NextResponse.json({ success: true, data: { items } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (body.action === "runFromPlan") {
      const result = await runFullPipelineFromPlan(body.planId, {
        dryRun: !!body.dryRun,
        autoPublish: body.autoPublish !== false,
        projectId: body.projectId,
        engines: body.engines as PlanEngine[] | undefined,
      });
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "runFromKeyword") {
      const result = await runFullPipelineFromKeyword(
        {
          primaryKeyword: body.primaryKeyword || body.keyword,
          category: body.category,
          geoProvinces: body.geoProvinces,
          planType: body.planType || "cluster",
        },
        {
          dryRun: !!body.dryRun,
          autoPublish: body.autoPublish !== false,
          projectId: body.projectId,
          engines: body.engines as PlanEngine[] | undefined,
        }
      );
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: "Geçersiz aksiyon" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline hatası";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
