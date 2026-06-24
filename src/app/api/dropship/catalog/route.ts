import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 20;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { sku: { contains: search } },
            { category: { contains: search } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.productCatalogItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        select: { id: true, name: true, sku: true, imagesJson: true, category: true, basePrice: true },
      }),
      prisma.productCatalogItem.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: items.map((item) => ({ ...item, description: "" })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
