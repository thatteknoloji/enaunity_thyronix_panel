import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { analyzeLegacyUrls } from "@/lib/legacy-recovery/legacy-recovery-service";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const data = await analyzeLegacyUrls({
      projectId: body.projectId ? String(body.projectId) : null,
      limit: body.limit ? Number(body.limit) : 1000,
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analiz başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
