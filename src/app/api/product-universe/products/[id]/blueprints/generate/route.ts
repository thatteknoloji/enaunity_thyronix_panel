import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateProductBlueprints, type ProductBlueprintBridgeOptions } from "@/lib/product-universe/product-blueprint-bridge";
import { productScopeFilter, requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

type RouteCtx = { params: Promise<{ id: string }> };

function parseOptions(body: Record<string, unknown>, isAdmin: boolean): ProductBlueprintBridgeOptions {
  return {
    projectId: String(body.projectId || ""),
    includeProductPage: body.includeProductPage !== false,
    includeCategoryPage: body.includeCategoryPage !== false,
    includeIntentPages: body.includeIntentPages !== false,
    includeGeoFusion: !!body.includeGeoFusion,
    includeFaqPage: body.includeFaqPage !== false,
    selectedProvinceIds: Array.isArray(body.selectedProvinceIds) ? body.selectedProvinceIds.map(String) : [],
    selectedDistrictIds: Array.isArray(body.selectedDistrictIds) ? body.selectedDistrictIds.map(String) : [],
    maxGenerate: body.maxGenerate != null ? Number(body.maxGenerate) : undefined,
    minQualityScore: body.minQualityScore != null ? Number(body.minQualityScore) : undefined,
    dryRun: !!body.dryRun,
    isAdmin,
  };
}

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const { id } = await ctx.params;
    const scope = productScopeFilter(guard.dealerId, guard.isAdmin);
    const product = await prisma.productUniverse.findFirst({ where: { id, ...scope } });
    if (!product) {
      return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    }

    const body = await req.json();
    const options = parseOptions(body, guard.isAdmin);
    if (!options.projectId) {
      return NextResponse.json({ success: false, error: "projectId gerekli" }, { status: 400 });
    }

    const data = await generateProductBlueprints(id, options);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generate başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
