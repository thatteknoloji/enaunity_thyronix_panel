import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { importLegacyUrls } from "@/lib/legacy-recovery/legacy-recovery-service";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const format = String(body.format || "manual") as "csv" | "txt" | "sitemap" | "manual";
    const data = await importLegacyUrls({
      format,
      content: body.content ? String(body.content) : undefined,
      urls: Array.isArray(body.urls) ? body.urls.map(String) : undefined,
      source: body.source ? String(body.source) : undefined,
      projectId: body.projectId ? String(body.projectId) : null,
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
