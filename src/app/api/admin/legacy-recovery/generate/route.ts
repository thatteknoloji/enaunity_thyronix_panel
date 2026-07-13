import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { enqueueJob } from "@/lib/job-center/enqueue";

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const limit = body.limit ? Number(body.limit) : 500;

    const job = await enqueueJob({
      jobType: "RECOVERY_GENERATION",
      entityType: "LEGACY_RECOVERY",
      entityId: body.projectId ? String(body.projectId) : "all",
      priority: body.priority || "NORMAL",
      totalSteps: limit,
      createdBy: user.id || user.email || "admin",
      metadata: {
        projectId: body.projectId ? String(body.projectId) : undefined,
        limit,
      },
    });

    return NextResponse.json(
      { success: true, jobId: job.id, status: job.status },
      { status: 202 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Üretim başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
