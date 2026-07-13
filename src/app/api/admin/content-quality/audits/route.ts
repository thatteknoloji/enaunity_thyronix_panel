import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getRecommendations,
  listAudits,
  listIssues,
} from "@/lib/content-quality/content-quality-service";
import type { ContentQualityContentType } from "@/lib/content-quality/types";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const contentType = searchParams.get("contentType") as ContentQualityContentType | null;

    if (view === "issues") {
      const issues = await listIssues({ contentType: contentType || undefined, limit: 100 });
      return NextResponse.json({ success: true, data: { issues } });
    }

    if (view === "recommendations") {
      const recommendations = await getRecommendations({
        contentType: contentType || undefined,
        limit: 100,
      });
      return NextResponse.json({ success: true, data: { recommendations } });
    }

    const data = await listAudits({
      contentType: contentType || undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 30,
      minQuality: searchParams.get("minQuality") ? Number(searchParams.get("minQuality")) : undefined,
      maxQuality: searchParams.get("maxQuality") ? Number(searchParams.get("maxQuality")) : undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
