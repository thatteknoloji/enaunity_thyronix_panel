import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { previewProductBlueprints, type ProductBlueprintBridgeOptions } from "@/lib/product-universe/product-blueprint-bridge";
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
    dryRun: true,
    isAdmin,
  };
}

async function assertProductAccess(productId: string, guard: Awaited<ReturnType<typeof requireProductUniverseApiAccess>>) {
  if (guard.error) return { error: guard.error, product: null };
  const scope = productScopeFilter(guard.dealerId, guard.isAdmin);
  const product = await prisma.productUniverse.findFirst({ where: { id: productId, ...scope } });
  if (!product) {
    return { error: NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 }), product: null };
  }
  return { error: null, product };
}

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const { id } = await ctx.params;
    const access = await assertProductAccess(id, guard);
    if (access.error) return access.error;

    const body = await req.json();
    const options = parseOptions(body, guard.isAdmin);
    if (!options.projectId) {
      return NextResponse.json({ success: false, error: "projectId gerekli" }, { status: 400 });
    }

    const data = await previewProductBlueprints(id, options);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Preview başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
