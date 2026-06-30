import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  findProductDuplicateConflicts,
  saveAdminProductGraph,
  validateAdminProductPayload,
} from "@/lib/products/admin-product-persist";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const stock = (searchParams.get("stock") || "").trim();
    const minPriceParam = (searchParams.get("minPrice") || "").trim();
    const maxPriceParam = (searchParams.get("maxPrice") || "").trim();
    const minPrice = minPriceParam === "" ? null : Number(minPriceParam);
    const maxPrice = maxPriceParam === "" ? null : Number(maxPriceParam);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(20, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    const conditions: Prisma.Sql[] = [];
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        Prisma.sql`("name" LIKE ${pattern} OR "sku" LIKE ${pattern} OR "barcode" LIKE ${pattern} OR "brand" LIKE ${pattern} OR "tags" LIKE ${pattern})`
      );
    }
    if (category) {
      conditions.push(Prisma.sql`"category" = ${category}`);
    }
    if (minPrice !== null && Number.isFinite(minPrice)) {
      conditions.push(Prisma.sql`"price" >= ${minPrice}`);
    }
    if (maxPrice !== null && Number.isFinite(maxPrice)) {
      conditions.push(Prisma.sql`"price" <= ${maxPrice}`);
    }
    if (stock === "low") {
      conditions.push(Prisma.sql`"stock" > 0 AND "stock" <= "minStockLevel"`);
    } else if (stock === "out") {
      conditions.push(Prisma.sql`"stock" <= 0`);
    } else if (stock === "ok") {
      conditions.push(Prisma.sql`"stock" > "minStockLevel"`);
    }

    const whereClause = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

    const countRows = await prisma.$queryRaw<Array<{ count: number }>>(
      Prisma.sql`SELECT COUNT(*) as count FROM "Product" ${whereClause}`
    );
    const total = Number(countRows[0]?.count || 0);

    const idRows = await prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT "id"
        FROM "Product"
        ${whereClause}
        ORDER BY "createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    );

    const ids = idRows.map((row) => row.id);
    if (ids.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { variants: true } } },
    });

    const orderMap = new Map(ids.map((id, index) => [id, index]));
    products.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    return NextResponse.json({
      success: true,
      data: products,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const data = (await req.json()) as Record<string, unknown>;
    const { payload, errors } = validateAdminProductPayload(data);

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors[0], errors }, { status: 400 });
    }

    const conflicts = await findProductDuplicateConflicts({
      sku: payload.sku,
      barcode: payload.barcode,
      modelCode: payload.modelCode,
      variants: payload.variants.map((variant) => ({
        sku: variant.sku,
        barcode: variant.barcode,
      })),
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        { success: false, error: "Aynı SKU / barkod / model kodu başka kayıtta kullanılıyor.", conflicts },
        { status: 409 },
      );
    }

    const product = await saveAdminProductGraph(payload);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 },
    );
  }
}
