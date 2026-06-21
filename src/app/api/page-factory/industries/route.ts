import { NextResponse } from "next/server";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { listIndustries } from "@/lib/data-universe/reference-service";

export async function GET(req: Request) {
  try {
    const { error } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const includeCategories = searchParams.get("includeCategories") === "true";

    if (includeCategories) {
      const { listIndustryCategories } = await import("@/lib/data-universe/reference-service");
      const [industries, categories] = await Promise.all([
        listIndustries(searchParams),
        listIndustryCategories(searchParams),
      ]);
      return NextResponse.json({ success: true, data: { industries, categories } });
    }

    const data = await listIndustries(searchParams);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sektör verisi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
