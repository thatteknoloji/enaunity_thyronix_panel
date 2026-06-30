import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/permission-guard";
import { getCartRecoverySettings, updateCartRecoverySettings } from "@/lib/cart/cart-observer-service";

export async function GET() {
  try {
    await requireAdminPermission("orders_view");
    const data = await getCartRecoverySettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Yetkisiz erişim" },
      { status: 401 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdminPermission("orders_approve");
    const body = await req.json();
    const data = await updateCartRecoverySettings({
      adminAlertEnabled: typeof body.adminAlertEnabled === "boolean" ? body.adminAlertEnabled : undefined,
      autoReminderEnabled: typeof body.autoReminderEnabled === "boolean" ? body.autoReminderEnabled : undefined,
      customerReminderHours: Number.isFinite(Number(body.customerReminderHours)) ? Number(body.customerReminderHours) : undefined,
      dealerReminderHours: Number.isFinite(Number(body.dealerReminderHours)) ? Number(body.dealerReminderHours) : undefined,
      secondReminderHours: Number.isFinite(Number(body.secondReminderHours)) ? Number(body.secondReminderHours) : undefined,
      cooldownHours: Number.isFinite(Number(body.cooldownHours)) ? Number(body.cooldownHours) : undefined,
      approvedByAdminId: admin.id,
      approvedByAdminName: admin.name,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ayarlar kaydedilemedi" },
      { status: 400 },
    );
  }
}
