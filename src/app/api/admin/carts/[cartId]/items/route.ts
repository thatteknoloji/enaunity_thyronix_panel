import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/permission-guard";
import { addCartItemAsAdmin } from "@/lib/cart/cart-observer-service";

export async function POST(req: Request, context: { params: Promise<{ cartId: string }> }) {
  try {
    const admin = await requireAdminPermission("orders_approve");
    const { cartId } = await context.params;
    const body = await req.json();

    const data = await addCartItemAsAdmin({
      cartId,
      adminId: admin.id,
      adminName: admin.name,
      productId: String(body.productId || ""),
      quantity: Number(body.quantity || 1),
      variantId: String(body.variantId || ""),
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ürün eklenemedi" },
      { status: 400 },
    );
  }
}
