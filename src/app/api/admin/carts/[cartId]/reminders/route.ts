import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/permission-guard";
import { sendCartReminder, type ReminderTemplateKey } from "@/lib/cart/cart-observer-service";

const VALID_TEMPLATES = new Set<ReminderTemplateKey>([
  "cart_reminder_basic",
  "cart_reminder_support",
  "cart_reminder_quote",
]);

export async function POST(req: Request, context: { params: Promise<{ cartId: string }> }) {
  try {
    const admin = await requireAdminPermission("orders_view");
    const { cartId } = await context.params;
    const body = await req.json();
    const templateKey = body.templateKey as ReminderTemplateKey;
    const channel = String(body.channel || "panel");

    if (!VALID_TEMPLATES.has(templateKey)) {
      return NextResponse.json({ success: false, error: "Geçersiz şablon" }, { status: 400 });
    }

    const channels =
      channel === "both"
        ? ["panel", "email"] as const
        : channel === "email"
          ? ["email"] as const
          : ["panel"] as const;

    const data = await sendCartReminder({
      cartId,
      adminId: admin.id,
      adminName: admin.name,
      templateKey,
      channels: [...channels],
      meta: {
        mode: "manual",
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Hatırlatma gönderilemedi" },
      { status: 400 },
    );
  }
}
