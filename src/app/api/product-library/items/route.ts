import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const catalogId = url.searchParams.get("catalogId") || undefined;
    const q = url.searchParams.get("q")?.trim() || "";
    const brand = url.searchParams.get("brand")?.trim() || "";
    const category = url.searchParams.get("category")?.trim() || "";
    const status = url.searchParams.get("status") || "ACTIVE";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (catalogId) where.catalogId = catalogId;
    if (status && status !== "ALL") where.status = status;
    if (brand) where.brand = { contains: brand };
    if (category) where.category = { contains: category };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { barcode: { contains: q } },
        { sku: { contains: q } },
        { brand: { contains: q } },
      ];
    }

    const [items, total, brands, categories] = await Promise.all([
      prisma.productCatalogItem.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        include: {
          catalog: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
      prisma.productCatalogItem.count({ where }),
      prisma.productCatalogItem.groupBy({
        by: ["brand"],
        where: catalogId ? { catalogId, status: "ACTIVE", brand: { not: "" } } : { status: "ACTIVE", brand: { not: "" } },
        _count: true,
        orderBy: { brand: "asc" },
        take: 50,
      }),
      prisma.productCatalogItem.groupBy({
        by: ["category"],
        where: catalogId ? { catalogId, status: "ACTIVE", category: { not: "" } } : { status: "ACTIVE", category: { not: "" } },
        _count: true,
        orderBy: { category: "asc" },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        filters: {
          brands: brands.map((b) => b.brand).filter(Boolean),
          categories: categories.map((c) => c.category).filter(Boolean),
        },
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { ids, status } = body as { ids?: string[]; status?: string };
    if (!ids?.length || !status) {
      return NextResponse.json({ success: false, error: "ids ve status zorunlu" }, { status: 400 });
    }
    const result = await prisma.productCatalogItem.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    return NextResponse.json({ success: true, data: { updated: result.count } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
