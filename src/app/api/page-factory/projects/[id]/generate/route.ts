import { NextResponse } from "next/server";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { getProjectDetail, parseMetadata } from "@/lib/page-factory/project-service";
import { isAdminRole } from "@/lib/auth/admin-access";
import { enqueueJob } from "@/lib/job-center/enqueue";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    const project = await getProjectDetail(id);
    if (!project) {
      return NextResponse.json({ success: false, error: "Proje bulunamadı" }, { status: 404 });
    }
    if (!isAdminRole(user.role) && project.dealerId && project.dealerId !== user.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    if (isAdminRole(user.role)) {
      const job = await enqueueJob({
        jobType: "PAGE_GENERATION",
        entityType: "PAGE_FACTORY_PROJECT",
        entityId: id,
        priority: "NORMAL",
        totalSteps: 5,
        createdBy: user.id || user.email || "admin",
        metadata: { projectId: id },
      });
      return NextResponse.json(
        {
          success: true,
          jobId: job.id,
          status: job.status,
          data: { jobId: job.id, status: job.status },
        },
        { status: 202 }
      );
    }

    const { generatePageFactoryPlan } = await import("@/lib/page-factory/project-service");
    const updated = await generatePageFactoryPlan(id);
    return NextResponse.json({
      success: true,
      data: { ...updated, metadata: parseMetadata(updated.metadataJson) },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Plan üretilemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
