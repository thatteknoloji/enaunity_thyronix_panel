import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertCanAccessProduct,
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { id, name, price, stock, brand, category, barcode } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "Ürün ID gerekli" }, { status: 400 });

    await assertCanAccessProduct(user, id);

    const update: any = {};
    if (name !== undefined) update.name = name;
    if (price !== undefined) update.price = parseFloat(price) || 0;
    if (stock !== undefined) update.stock = parseInt(stock) || 0;
    if (brand !== undefined) update.brand = brand;
    if (category !== undefined) update.category = category;
    if (barcode !== undefined) update.barcode = barcode;

    await prisma.thyronixProduct.update({ where: { id }, data: update });
    return NextResponse.json({ success: true });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
