import { NextResponse } from "next/server";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { queryGeoTree } from "@/lib/data-universe/geo-service";

export async function GET(req: Request) {
  try {
    const { error } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const data = await queryGeoTree(searchParams);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "GEO verisi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
