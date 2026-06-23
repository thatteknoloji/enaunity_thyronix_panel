import { NextResponse } from "next/server";
import { runPipelineForUniverseJob, getPublishedPagesForUniverseJob } from "@/lib/page-factory/universe/universe-pipeline-service";
import { getUniverseJob } from "@/lib/page-factory/universe/universe-generator-service";
import { parseUniversePipelineBody } from "@/lib/page-factory/universe/universe-api-parse";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { isAdminRole } from "@/lib/auth/admin-access";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    const options = parseUniversePipelineBody(body);

    const data = await runPipelineForUniverseJob(
      id,
      { autoRunPipeline: true, ...options },
      {
        isAdmin: isAdminRole(user.role),
        dealerId: user.dealerId,
      }
    );

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Universe pipeline başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    const job = await getUniverseJob(id, user.dealerId);
    if (!job?.projectId) {
      return NextResponse.json({ success: false, error: "Job bulunamadı" }, { status: 404 });
    }

    const publishedPages = await getPublishedPagesForUniverseJob(id, job.projectId);
    return NextResponse.json({ success: true, data: { publishedPages } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yayınlanan sayfalar yüklenemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
