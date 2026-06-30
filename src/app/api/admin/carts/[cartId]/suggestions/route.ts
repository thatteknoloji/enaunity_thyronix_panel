import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/permission-guard";
import { buildCartSuggestions, createCartSuggestionAction } from "@/lib/cart/cart-observer-service";

export async function POST(req: Request, context: { params: Promise<{ cartId: string }> }) {
  try {
    const admin = await requireAdminPermission("orders_view");
    const { cartId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = body.action as "quote" | "support_call" | "saved_cart" | "sales_task" | undefined;

    const suggestions = await buildCartSuggestions(cartId);
    const applied = action
      ? await createCartSuggestionAction({
          cartId,
          adminId: admin.id,
          adminName: admin.name,
          action,
        })
      : null;

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        applied,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Öneri üretilemedi" },
      { status: 400 },
    );
  }
}
