import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/permission-guard";
import { getObservedCartDetail } from "@/lib/cart/cart-observer-service";

export async function GET(_: Request, context: { params: Promise<{ cartId: string }> }) {
  try {
    await requireAdminPermission("orders_view");
    const { cartId } = await context.params;
    const data = await getObservedCartDetail(cartId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sepet bulunamadı" },
      { status: 404 },
    );
  }
}
