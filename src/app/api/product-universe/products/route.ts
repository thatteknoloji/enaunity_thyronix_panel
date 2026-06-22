import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProductUniverseStats } from "@/lib/product-universe/import-service";
import { productScopeFilter, requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status")?.trim();
    const sourceType = searchParams.get("sourceType")?.trim();
    const projectId = searchParams.get("projectId")?.trim();
    const category = searchParams.get("category")?.trim();
    const brand = searchParams.get("brand")?.trim();
    const statsOnly = searchParams.get("stats") === "true";

    const scope = productScopeFilter(guard.dealerId, guard.isAdmin);

    if (statsOnly) {
      const stats = await getProductUniverseStats(guard.isAdmin ? null : guard.dealerId);
      return NextResponse.json({ success: true, data: { stats } });
    }

    const where: Prisma.ProductUniverseWhereInput = { ...scope };
    if (q) {
      where.OR = [
        { rawName: { contains: q } },
        { normalizedName: { contains: q } },
        { brand: { contains: q } },
        { barcode: { contains: q } },
      ];
    }
    if (status) where.status = status as Prisma.EnumProductUniverseStatusFilter["equals"];
    if (sourceType) where.sourceType = sourceType as Prisma.EnumProductUniverseSourceTypeFilter["equals"];
    if (projectId) where.projectId = projectId;
    if (category) where.categoryPath = { contains: category };
    if (brand) where.brand = { contains: brand };

    const [items, total, stats] = await Promise.all([
      prisma.productUniverse.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { entities: true, images: true } },
        },
      }),
      prisma.productUniverse.count({ where }),
      getProductUniverseStats(guard.isAdmin ? null : guard.dealerId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: items.map((p) => ({
          id: p.id,
          rawName: p.rawName,
          normalizedName: p.normalizedName,
          slug: p.slug,
          brand: p.brand,
          categoryPath: p.categoryPath,
          status: p.status,
          sourceType: p.sourceType,
          qualityScore: p.qualityScore,
          price: p.price,
          currency: p.currency,
          entityCount: p._count.entities,
          imageCount: p._count.images,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ürün listesi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
