import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  generateContentPlan,
  listContentPlans,
  previewContentPlan,
} from "@/lib/content-planning/content-planning-service";
import type { PlanEngine } from "@/lib/content-planning/types";

export async function GET() {
  try {
    await requireAdmin();
    const plans = await listContentPlans(100);
    return NextResponse.json({ success: true, data: { plans } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const action = body.action || "create";

    if (action === "preview") {
      const preview = previewContentPlan({
        primaryKeyword: body.primaryKeyword || body.keyword,
        keywordGroup: body.keywordGroup,
        category: body.category,
        productId: body.productId,
        productName: body.productName,
        includeGeo: body.includeGeo !== false,
        includeFaq: body.includeFaq !== false,
        includeBlogs: body.includeBlogs !== false,
        includeCategories: body.includeCategories !== false,
        geoProvinces: body.geoProvinces,
        planType: body.planType || "cluster",
        name: body.name,
      });
      return NextResponse.json({ success: true, data: preview });
    }

    if (action === "publish") {
      const { runFullPipelineFromPlan } = await import("@/lib/content-operations/content-pipeline-service");
      const result = await runFullPipelineFromPlan(body.planId, {
        engines: body.engines as PlanEngine[],
        autoPublish: body.autoPublish !== false,
        dryRun: !!body.dryRun,
        projectId: body.projectId,
      });
      return NextResponse.json({ success: true, data: result });
    }

    const created = await generateContentPlan({
      primaryKeyword: body.primaryKeyword || body.keyword,
      keywordGroup: body.keywordGroup,
      category: body.category,
      productId: body.productId,
      productName: body.productName,
      includeGeo: body.includeGeo !== false,
      includeFaq: body.includeFaq !== false,
      includeBlogs: body.includeBlogs !== false,
      includeCategories: body.includeCategories !== false,
      geoProvinces: body.geoProvinces,
      planType: body.planType || "cluster",
      name: body.name,
      status: "READY",
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
