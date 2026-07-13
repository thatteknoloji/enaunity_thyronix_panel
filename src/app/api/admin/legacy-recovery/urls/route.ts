import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getGeneratedContent, listLegacyUrls } from "@/lib/legacy-recovery/legacy-recovery-service";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const projectId = searchParams.get("projectId");

    if (view === "generated") {
      const items = await getGeneratedContent(projectId || null);
      return NextResponse.json({ success: true, data: { items } });
    }

    const data = await listLegacyUrls({
      status: searchParams.get("status") || undefined,
      strategy: searchParams.get("strategy") || undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 50,
      projectId: projectId || null,
    });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
