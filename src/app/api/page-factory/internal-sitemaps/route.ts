import { NextResponse } from "next/server";
import {
  generateAllInternalSitemaps,
  generateInternalSitemap,
  getInternalSitemapStats,
  getInternalSitemaps,
  markSitemapStale,
} from "@/lib/page-factory/publish/internal-sitemap-service";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { isAdminRole } from "@/lib/auth/admin-access";
import type { PageFactoryInternalSitemapType } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;
    const withStats = searchParams.get("stats") === "true";

    const list = await getInternalSitemaps({
      projectId,
      sitemapType: searchParams.get("sitemapType") || undefined,
      status: searchParams.get("status") || undefined,
      page: parseInt(searchParams.get("page") || "1", 10) || 1,
      limit: parseInt(searchParams.get("limit") || "20", 10) || 20,
    });

    let stats = null;
    if (withStats) {
      stats = await getInternalSitemapStats(projectId);
    }

    return NextResponse.json({ success: true, data: { ...list, stats } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sitemap listesi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: "Admin yetkisi gerekli" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "generate");
    const projectId = body.projectId ? String(body.projectId) : undefined;

    if (action === "generate-all") {
      const result = await generateAllInternalSitemaps(projectId);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "mark-stale") {
      const result = await markSitemapStale(projectId);
      return NextResponse.json({ success: true, data: result });
    }

    const sitemapType = (body.sitemapType as PageFactoryInternalSitemapType) || "MAIN";
    const result = await generateInternalSitemap(projectId, sitemapType);
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sitemap üretimi başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
