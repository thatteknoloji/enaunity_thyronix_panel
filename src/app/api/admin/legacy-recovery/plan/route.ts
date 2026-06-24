import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { planLegacyUrls } from "@/lib/legacy-recovery/legacy-recovery-service";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const data = await planLegacyUrls({
      projectId: body.projectId ? String(body.projectId) : null,
      limit: body.limit ? Number(body.limit) : 1000,
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Planlama başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
