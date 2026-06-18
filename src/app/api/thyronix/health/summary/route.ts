import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse, withTenantFilter } from "@/lib/thyronix/access";

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const tenantWhere = withTenantFilter(user, {});

    const [
      missingBarcode, missingBrand, missingCategory, missingDescription,
      zeroPrice, zeroStock, negativePrice, negativeStock, totalActive, totalAll,
    ] = await Promise.all([
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { barcode: null }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { OR: [{ brand: null }, { brand: "" }] }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { OR: [{ category: null }, { category: "" }] }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { OR: [{ description: null }, { description: "" }] }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { price: 0 }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { stock: 0 }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { price: { lt: 0 } }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { stock: { lt: 0 } }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { status: "active" }) }),
      prisma.thyronixProduct.count({ where: tenantWhere }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        missingBarcode, missingBrand, missingCategory, missingDescription,
        zeroPrice, zeroStock, negativePrice, negativeStock, totalActive, totalAll,
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
