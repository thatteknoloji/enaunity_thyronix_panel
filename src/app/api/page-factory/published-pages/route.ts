import { NextResponse } from "next/server";
import {
  getPublishedPageIndex,
  getPublishedPageStats,
  rebuildPublishedPageIndex,
  validatePublishedPages,
} from "@/lib/page-factory/publish/page-index-service";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { isAdminRole } from "@/lib/auth/admin-access";

export async function GET(req: Request) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const isAdmin = isAdminRole(user.role);
    const dealerId = isAdmin ? undefined : user.dealerId;

    const result = await getPublishedPageIndex(
      {
        projectId: searchParams.get("projectId") || undefined,
        dealerId,
        status: searchParams.get("status") || undefined,
        robots: (searchParams.get("robots") as "index" | "noindex" | "all") || undefined,
        blueprintType: searchParams.get("blueprintType") || undefined,
        generationSource: searchParams.get("generationSource") || undefined,
        minSeoScore: searchParams.get("minSeoScore") ? parseInt(searchParams.get("minSeoScore")!, 10) : undefined,
        minAeoScore: searchParams.get("minAeoScore") ? parseInt(searchParams.get("minAeoScore")!, 10) : undefined,
        minGeoScore: searchParams.get("minGeoScore") ? parseInt(searchParams.get("minGeoScore")!, 10) : undefined,
        query: searchParams.get("query") || searchParams.get("search") || undefined,
        page: parseInt(searchParams.get("page") || "1", 10) || 1,
        pageSize: parseInt(searchParams.get("pageSize") || searchParams.get("limit") || "20", 10) || 20,
      },
      { isAdmin }
    );

    let stats = null;
    if (searchParams.get("stats") === "true") {
      stats = await getPublishedPageStats(
        searchParams.get("projectId") || undefined,
        dealerId
      );
    }

    return NextResponse.json({ success: true, data: { ...result, items: result.items, stats } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yayınlanan sayfalar alınamadı";
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
    const action = String(body.action || "");

    if (action === "rebuild-index") {
      const result = await rebuildPublishedPageIndex(body.projectId ? String(body.projectId) : undefined);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "validate") {
      const result = await validatePublishedPages(body.projectId ? String(body.projectId) : undefined);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: "Geçersiz action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
