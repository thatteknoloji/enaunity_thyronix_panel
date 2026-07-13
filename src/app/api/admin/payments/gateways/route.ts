import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPaymentSettingsForAdmin, savePaymentSettings } from "@/lib/payments/payment-settings";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getPaymentSettingsForAdmin();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = await savePaymentSettings(body);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Kaydedilemedi" },
      { status: 500 },
    );
  }
}
