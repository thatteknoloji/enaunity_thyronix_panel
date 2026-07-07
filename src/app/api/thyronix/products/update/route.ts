import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertCanAccessProduct,
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
} from "@/lib/thyronix/access";
import { applyThyronixFieldLocksAfterEdit } from "@/lib/thyronix/field-lock";

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ success: false, error: "Ürün ID gerekli" }, { status: 400 });

    await assertCanAccessProduct(user, id);

    const before = await prisma.thyronixProduct.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });

    const update: Record<string, unknown> = {};
    const fields = [
      "name", "description", "price", "stock", "brand", "category", "barcode",
      "image", "images", "modelCode", "stockCode",
    ] as const;
    for (const field of fields) {
      if (body[field] === undefined) continue;
      if (field === "price") update.price = parseFloat(body[field]) || 0;
      else if (field === "stock") update.stock = parseInt(body[field], 10) || 0;
      else update[field] = body[field];
    }

    if (!Object.keys(update).length) {
      return NextResponse.json({ success: false, error: "Güncellenecek alan yok" }, { status: 400 });
    }

    const after = await prisma.thyronixProduct.update({ where: { id }, data: update });
    await applyThyronixFieldLocksAfterEdit(
      id,
      before as unknown as Record<string, unknown>,
      after as unknown as Record<string, unknown>,
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
