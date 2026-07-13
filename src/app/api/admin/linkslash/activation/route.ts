import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createActivationCodes, listActivationCodes, revokeActivationCode } from "@/lib/linkslash/activation";

export async function GET() {
  try {
    await requireAdmin();
    const codes = await listActivationCodes(200);
    return NextResponse.json({ success: true, data: codes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kodlar alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await req.json()) as { count?: number; durationDays?: number; action?: string; id?: string };
    if (body.action === "revoke" && body.id) {
      await revokeActivationCode(body.id);
      return NextResponse.json({ success: true });
    }
    const count = Math.min(Math.max(body.count || 1, 1), 50);
    const durationDays = Math.min(Math.max(body.durationDays || 365, 1), 3650);
    const codes = await createActivationCodes(count, durationDays, admin.id);
    return NextResponse.json({ success: true, data: codes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kod üretilemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
