import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeProduct } from "@/lib/product-universe/import-service";
import { productScopeFilter, requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const { id } = await ctx.params;
    const scope = productScopeFilter(guard.dealerId, guard.isAdmin);

    const product = await prisma.productUniverse.findFirst({ where: { id, ...scope } });
    if (!product) {
      return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    }

    await analyzeProduct(id);

    const updated = await prisma.productUniverse.findUnique({
      where: { id },
      include: {
        entities: true,
        attributes: true,
        images: true,
        contentDNA: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analiz başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
