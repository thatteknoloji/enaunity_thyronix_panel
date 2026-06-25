import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { cancelJob, pauseJob, resumeJob, retryJob } from "@/lib/job-center/job-service";
import { triggerWorker } from "@/lib/job-center/job-worker";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const action = String(body.action || "");

    let job;
    switch (action) {
      case "cancel":
        job = await cancelJob(id, body.reason ? String(body.reason) : undefined);
        break;
      case "pause":
        job = await pauseJob(id);
        break;
      case "resume":
        job = await resumeJob(id);
        triggerWorker();
        break;
      case "retry":
        job = await retryJob(id);
        triggerWorker();
        break;
      default:
        return NextResponse.json({ success: false, error: "Geçersiz action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: job });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
