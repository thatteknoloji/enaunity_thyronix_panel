import { NextResponse } from "next/server";
import { generateBlueprintBatch } from "@/lib/product-universe/blueprint-batch-engine";
import type { BlueprintBatchFilters, BlueprintTypeSlug } from "@/lib/product-universe/blueprint-batch-types";
import { BLUEPRINT_TYPE_OPTIONS } from "@/lib/product-universe/blueprint-batch-types";
import { requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

function parseFilters(body: Record<string, unknown>): BlueprintBatchFilters {
  return {
    projectId: body.projectId ? String(body.projectId) : undefined,
    sourceType: body.sourceType ? String(body.sourceType) : undefined,
    sourceId: body.sourceId ? String(body.sourceId) : undefined,
    category: body.category ? String(body.category) : undefined,
    brand: body.brand ? String(body.brand) : undefined,
    minQualityScore: body.minQualityScore != null ? Number(body.minQualityScore) : 70,
    onlyWithImages: body.onlyWithImages === true,
    onlyInStock: body.onlyInStock === true,
    blueprintTypes: Array.isArray(body.blueprintTypes)
      ? (body.blueprintTypes.map(String).filter((t) =>
          (BLUEPRINT_TYPE_OPTIONS as readonly string[]).includes(t)
        ) as BlueprintTypeSlug[])
      : undefined,
    includeGeo: body.includeGeo === true,
    limit: body.limit != null ? Number(body.limit) : undefined,
    dryRun: body.dryRun === true,
    duplicateMode: body.duplicateMode === "update" ? "update" : "skip",
  };
}

export async function POST(req: Request) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const body = await req.json();
    const filters = parseFilters(body);

    if (!filters.dryRun && !filters.projectId) {
      return NextResponse.json({ success: false, error: "projectId gerekli" }, { status: 400 });
    }

    const data = await generateBlueprintBatch(filters, {
      dealerId: guard.dealerId,
      isAdmin: guard.isAdmin,
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Batch generate başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
