import { NextResponse } from "next/server";
import { getMainInternalSitemapJson } from "@/lib/page-factory/publish/internal-sitemap-service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;
    const payload = await getMainInternalSitemapJson(projectId);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sitemap alınamadı";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
