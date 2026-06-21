import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteDevice, revokeDevice } from "@/lib/linkslash/devices";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await deleteDevice(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Silinemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await revokeDevice(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
