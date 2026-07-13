import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listAllDevices, resetUserDevices, revokeDevice } from "@/lib/linkslash/devices";

export async function GET() {
  try {
    await requireAdmin();
    const devices = await listAllDevices(200);
    return NextResponse.json({ success: true, data: devices });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cihazlar alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as { action?: string; userId?: string; id?: string };
    if (body.action === "reset" && body.userId) {
      await resetUserDevices(body.userId);
      return NextResponse.json({ success: true });
    }
    if (body.action === "revoke" && body.id) {
      await revokeDevice(body.id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
