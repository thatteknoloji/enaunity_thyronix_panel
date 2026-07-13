import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildLinkSlashReleaseChecklist } from "@/lib/linkslash/release-checklist";

export async function GET() {
  try {
    await requireAdmin();
    const data = await buildLinkSlashReleaseChecklist();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checklist alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}
