import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateLegacyRecoveries } from "@/lib/legacy-recovery/recovery-executor";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const data = await generateLegacyRecoveries({
      projectId: body.projectId ? String(body.projectId) : null,
      limit: body.limit ? Number(body.limit) : 500,
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Üretim başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
