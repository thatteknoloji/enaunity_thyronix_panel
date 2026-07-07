import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertCanAccessProduct,
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const products = await prisma.thyronixProduct.findMany({
      where: withTenantFilter(user, { status: "missing_from_source" }),
      select: {
        id: true,
        name: true,
        externalId: true,
        barcode: true,
        stock: true,
        price: true,
        sourceId: true,
        updatedAt: true,
        source: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    return NextResponse.json({ success: true, data: products, total: products.length });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const productIds = (body.productIds as string[]) || [];
    const action = body.action === "delete" ? "delete" : "keep";

    if (!productIds.length) {
      return NextResponse.json({ success: false, error: "Ürün seçin" }, { status: 400 });
    }

    for (const id of productIds) {
      await assertCanAccessProduct(user, id);
    }

    if (action === "delete") {
      const result = await prisma.thyronixProduct.deleteMany({
        where: { id: { in: productIds }, status: "missing_from_source" },
      });
      await prisma.thyronixSyncLog.create({
        data: {
          type: "missing-approval",
          status: "success",
          message: `${result.count} kaynaktan düşen ürün silindi (bayi onayı)`,
          productCount: result.count,
        },
      });
      return NextResponse.json({ success: true, data: { deleted: result.count } });
    }

    return NextResponse.json({
      success: true,
      data: { kept: productIds.length, message: "Ürünler panelde kalmaya devam ediyor (çıktıda stok 0)" },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
