import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { enqueueJob } from "@/lib/job-center/enqueue";

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const slug = String(body.slug || "");
    if (!slug) {
      return NextResponse.json({ success: false, error: "slug zorunlu" }, { status: 400 });
    }

    const job = await enqueueJob({
      jobType: "AI_REWRITE",
      entityType: "BLOG",
      entityId: slug,
      priority: body.priority || "HIGH",
      totalSteps: 7,
      createdBy: user.id || user.email || "admin",
      metadata: {
        slug,
        autoPublish: body.autoPublish === true,
      },
    });

    return NextResponse.json(
      { success: true, jobId: job.id, status: job.status },
      { status: 202 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Rewrite kuyruğa alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
