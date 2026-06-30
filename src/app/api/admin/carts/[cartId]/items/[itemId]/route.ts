import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/permission-guard";
import { updateCartItemAsAdmin } from "@/lib/cart/cart-observer-service";

export async function PATCH(req: Request, context: { params: Promise<{ cartId: string; itemId: string }> }) {
  try {
    const admin = await requireAdminPermission("orders_approve");
    const { cartId, itemId } = await context.params;
    const body = await req.json();

    const data = await updateCartItemAsAdmin({
      cartId,
      itemId,
      adminId: admin.id,
      adminName: admin.name,
      quantity: Number(body.quantity),
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sepet kalemi güncellenemedi" },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ cartId: string; itemId: string }> }) {
  try {
    const admin = await requireAdminPermission("orders_approve");
    const { cartId, itemId } = await context.params;

    const data = await updateCartItemAsAdmin({
      cartId,
      itemId,
      adminId: admin.id,
      adminName: admin.name,
      quantity: 0,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sepet kalemi silinemedi" },
      { status: 400 },
    );
  }
}
