import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getEcosystemSectionSettings,
  updateEcosystemSectionSettings,
} from "@/lib/ecosystem/section-service";

export async function GET() {
  try {
    const data = await getEcosystemSectionSettings();
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ success: false, error: "Ayarlar yüklenemedi" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = await updateEcosystemSectionSettings(body);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kaydedilemedi";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
