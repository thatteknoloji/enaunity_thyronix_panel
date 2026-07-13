import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getBalanceTopUpSettings, updateBalanceTopUpSettings } from "@/lib/payments/balance-topup-settings";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getBalanceTopUpSettings();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ayarlar alınamadı";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = await updateBalanceTopUpSettings(body);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ayarlar kaydedilemedi";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
