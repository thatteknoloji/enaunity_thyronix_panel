import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { planProductBlueprints } from "@/lib/product-universe/product-blueprint-planner";
import { productScopeFilter, requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const { id } = await ctx.params;
    const scope = productScopeFilter(guard.dealerId, guard.isAdmin);

    const product = await prisma.productUniverse.findFirst({
      where: { id, ...scope },
      include: {
        entities: { orderBy: { confidence: "desc" } },
        attributes: true,
        images: { orderBy: { sortOrder: "asc" } },
        contentDNA: true,
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    }

    const blueprintPreview = planProductBlueprints(product);

    return NextResponse.json({
      success: true,
      data: { ...product, blueprintPreview },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ürün detayı alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
