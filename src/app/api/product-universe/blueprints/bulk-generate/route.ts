import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateBulkProductBlueprints, type ProductBlueprintBridgeOptions } from "@/lib/product-universe/product-blueprint-bridge";
import { productScopeFilter, requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

export async function POST(req: Request) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const body = await req.json();
    const productIds = Array.isArray(body.productIds) ? body.productIds.map(String) : [];
    if (!productIds.length) {
      return NextResponse.json({ success: false, error: "productIds gerekli" }, { status: 400 });
    }

    const projectId = String(body.projectId || "");
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId gerekli" }, { status: 400 });
    }

    const scope = productScopeFilter(guard.dealerId, guard.isAdmin);
    const allowed = await prisma.productUniverse.findMany({
      where: { id: { in: productIds }, ...scope },
      select: { id: true },
    });
    const allowedIds = allowed.map((p) => p.id);
    if (!allowedIds.length) {
      return NextResponse.json({ success: false, error: "Erişilebilir ürün bulunamadı" }, { status: 403 });
    }

    const options: ProductBlueprintBridgeOptions = {
      projectId,
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
      batchSize: body.batchSize != null ? Number(body.batchSize) : undefined,
      isAdmin: guard.isAdmin,
    };

    const data = await generateBulkProductBlueprints(allowedIds, options);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bulk generate başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
